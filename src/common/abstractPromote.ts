/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags, Interfaces } from '@oclif/core';
import { HttpRequest, HttpResponse } from 'jsforce';
import { DeployPipelineCache } from '../common/deployPipelineCache';
import {
  fetchAndValidatePipelineStage,
  PipelineStage,
  PromoteOptions,
  PromotePipelineResult,
  validateTestFlags,
} from '../common';
import {
  branchName,
  bundleVersionName,
  deployAll,
  devopsCenterProjectName,
  requiredDoceOrgFlag,
  specificTests,
  testLevel,
  async,
} from '../common/flags';
import { REST_PROMOTE_BASE_URL } from './constants';

export type Flags<T extends typeof SfCommand> = Interfaces.InferredFlags<
  (typeof PromoteCommand)['globalFlags'] & T['flags']
>;

export abstract class PromoteCommand<T extends typeof SfCommand> extends SfCommand<PromotePipelineResult> {
  // common flags that can be inherited by any command that extends PromoteCommand
  public static globalFlags = {
    'branch-name': branchName,
    'bundle-version-name': bundleVersionName,
    'deploy-all': deployAll,
    'devops-center-project-name': devopsCenterProjectName,
    'devops-center-username': requiredDoceOrgFlag(),
    tests: specificTests,
    'test-level': testLevel(),
    async,
  };
  protected flags!: Flags<T>;
  private targetStage: PipelineStage;
  private sourceStageId: string;
  private deployOptions: Partial<PromoteOptions>;
  private numRetries409 = 50; // this is the number of times we retry if we get a http-409-Conflict response

  public async init(): Promise<void> {
    await super.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { flags } = await this.parse(this.constructor as Interfaces.Command.Class);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.flags = flags;
  }

  protected async executePromotion(): Promise<PromotePipelineResult> {
    validateTestFlags(this.flags['test-level'], this.flags.tests);
    const doceOrg: Org = this.flags['devops-center-username'] as Org;
    this.targetStage = await fetchAndValidatePipelineStage(
      doceOrg,
      this.flags['devops-center-project-name'],
      this.flags['branch-name']
    );
    this.sourceStageId = this.getSourceStageId();
    const asyncOperationId: string = await this.retryEnabledRequestPromotion(doceOrg, this.numRetries409);
    this.spinner.stop();
    if (asyncOperationId?.includes('errorCode')) {
      throw new Error(JSON.stringify(asyncOperationId)); // Is this the type of error we want to throw here?
    }

    if (this.flags['async']) {
      await DeployPipelineCache.set(asyncOperationId, {});
      // TODO display async message
      this.logSuccess('Async message TBD');
    }

    // TODO: move this to logger service
    this.log(`Job ID: ${asyncOperationId}`);

    return { jobId: asyncOperationId };
  }

  protected async retryEnabledRequestPromotion(doceOrg: Org, numRetries: number): Promise<string> {
    try {
      const asyncOperationId: string = await this.requestPromotion(doceOrg);
      return asyncOperationId;
    } catch (error) {
      const err = error as HttpResponse;
      // if we get anything besdies a 409 or run out of retries we throw an error
      if (err['errorCode'] !== 'ERROR_HTTP_409' || numRetries < 1) {
        return JSON.stringify(err); // we can't throw the error from this promise because then it doesn't surface to the user
      }
      // this.log('Number of Retries Remaining: ' + numRetries.toString()); // todo: do we want to remove this for users since we won't tell them how many times we are trying/failing ??
      // await new Promise((f) => setTimeout(f, 1000)); // this is a sleep for 1 second between 409 failure reattempts.
      if (numRetries === this.numRetries409)
        // we only start the spinner the first time we pass through here
        this.spinner.start('Sync of VCS Events In-Progress');
      return this.retryEnabledRequestPromotion(doceOrg, numRetries - 1);
    }
  }

  protected getTargetStage(): PipelineStage {
    return this.targetStage;
  }

  private async requestPromotion(targetOrg: Org): Promise<string> {
    this.buildPromoteOptions();
    const req: HttpRequest = {
      method: 'POST',
      url: `${REST_PROMOTE_BASE_URL as string}${
        this.targetStage.sf_devops__Pipeline__r.sf_devops__Project__c
      }/pipelineName/${this.sourceStageId}`,
      body: JSON.stringify({
        changeBundleName: this.flags['bundle-version-name'],
        promoteOptions: this.deployOptions,
      }),
    };
    /* 
    const req: HttpRequest = {
      method: 'GET',
      url: 'http://localhost:8081/throw409' ,
      body: JSON.stringify({
        oldURL: `${REST_PROMOTE_BASE_URL as string}${
          this.targetStage.sf_devops__Pipeline__r.sf_devops__Project__c
        }/pipelineName/${this.sourceStageId}`,
        changeBundleName: this.flags['bundle-version-name'],
        promoteOptions: this.deployOptions,
      }),
    };*/

    return targetOrg.getConnection().request(req);
  }

  private buildPromoteOptions(): void {
    this.deployOptions = {
      fullDeploy: this.flags['deploy-all'],
      testLevel: this.flags['test-level'] ?? 'Default',
      runTests: this.flags['tests'] ? this.flags['tests'].join(',') : undefined,
      // get more promote options from the concrete implementation if needed
      ...this.getPromoteOptions(),
    };
  }

  /**
   * Knows how to compute the target pipeline stage Id based on the type of promotion.
   *
   * @returns: string. It is the source stage Id.
   */
  protected abstract getSourceStageId(): string;

  /**
   * Returns the specific promote options specific for every concrete implementations.
   *
   * @returns: Partial<PromoteOptions>.
   */
  protected abstract getPromoteOptions(): Partial<PromoteOptions>;
}
