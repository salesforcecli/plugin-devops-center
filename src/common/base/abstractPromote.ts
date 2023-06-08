/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags, Interfaces } from '@oclif/core';
import { HttpRequest } from 'jsforce';
import { fetchAndValidatePipelineStage, PipelineStage, PromoteOptions, validateTestFlags } from '..';
import { devopsCenterProjectName, requiredDoceOrgFlag, wait, verbose, concise } from '../flags/flags';
import {
  branchName,
  bundleVersionName,
  deployAll,
  specificTests,
  testLevel,
  async,
} from '../flags/promote/promoteFlags';
import { REST_PROMOTE_BASE_URL, HTTP_CONFLICT_CODE } from '../constants';
import { ApiError, ApiPromoteResponse, AsyncOperationResultJson } from '../../common';
import { OutputServiceFactory } from '../outputService';
import { sleep } from '../utils';
import { AsyncCommand } from './abstractAsyncOperation';

export type Flags<T extends typeof SfCommand> = Interfaces.InferredFlags<
  (typeof PromoteCommand)['baseFlags'] & T['flags']
>;

export abstract class PromoteCommand<T extends typeof SfCommand> extends AsyncCommand {
  // common flags that can be inherited by any command that extends PromoteCommand
  public static baseFlags = {
    'branch-name': branchName,
    'bundle-version-name': bundleVersionName,
    'deploy-all': deployAll,
    'devops-center-project-name': devopsCenterProjectName,
    'devops-center-username': requiredDoceOrgFlag(),
    tests: specificTests,
    'test-level': testLevel(),
    async,
    wait,
    verbose,
    concise,
  };

  protected flags!: Flags<T>;
  private targetStage: PipelineStage;
  private sourceStageId: string;
  private deployOptions: Partial<PromoteOptions>;
  private numRetries409 = 50; // this is the number of times we retry if we get a http-409-Conflict response

  public async init(): Promise<void> {
    await super.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof PromoteCommand).baseFlags,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.flags = flags as Flags<T>;
    this.targetOrg = this.flags['devops-center-username'] as Org;
    this.setOutputService(new OutputServiceFactory().forDeployment(this.flags, this.targetOrg.getConnection()));
  }

  protected async executePromotion(): Promise<AsyncOperationResultJson> {
    validateTestFlags(this.flags['test-level'], this.flags.tests);
    this.targetStage = await fetchAndValidatePipelineStage(
      this.targetOrg,
      this.flags['devops-center-project-name'],
      this.flags['branch-name']
    );
    this.sourceStageId = this.getSourceStageId();
    this.setAsyncOperationId(await this.requestPromotionFlow());

    return this.monitorOperation(this.flags.async, this.flags.wait);
  }

  /**
   *
   * Sends an Http request to the target org to initiate a promotion.
   *
   * @returns Aor Id of promote operation.
   */
  protected async requestPromotionFlow(): Promise<string> {
    let spinnerStarted = false;
    try {
      return await this.requestPromotion();
    } catch (error) {
      const err = error as ApiError;
      // if we get a 409 error then call the retry flow
      if (err.errorCode === HTTP_CONFLICT_CODE) {
        this.spinner.start('Synchronization of source control system events in progress');
        spinnerStarted = true;
        return await this.retryRequestPromotion(this.numRetries409);
      }
      throw error;
    } finally {
      if (spinnerStarted) this.spinner.stop();
    }
  }

  /**
   *
   * Sends an Http request to the target org to initiate a promotion.
   * If it gets a 409/Conflict it will retry till the request successes,
   * gets a differenct error or run out of retry attempts.
   *
   * @param numRetries Amount of remaining retry attempts.
   * @returns Aor Id of promote operation
   */
  protected async retryRequestPromotion(numRetries: number): Promise<string> {
    try {
      // Sleep 2 seconds before requesting promotion again.
      await sleep(2000);
      return await this.requestPromotion();
    } catch (error) {
      const err = error as ApiError;
      // if we still get a 409 error and haven't run out of retry attempts then retry again
      if (err.errorCode === HTTP_CONFLICT_CODE && numRetries > 1) {
        return this.retryRequestPromotion(numRetries - 1);
      }
      throw error;
    }
  }

  protected getTargetStage(): PipelineStage {
    return this.targetStage;
  }

  private async requestPromotion(): Promise<string> {
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
    const response: ApiPromoteResponse = await this.targetOrg.getConnection().request(req);
    return response.jobId;
  }

  private buildPromoteOptions(): void {
    this.deployOptions = {
      fullDeploy: this.flags['deploy-all'],
      testLevel: this.flags['test-level'] ?? 'Default',
      runTests: this.flags.tests ? this.flags.tests.join(',') : undefined,
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
