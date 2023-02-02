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
import { DeployPipelineCache } from '../common/deployPipelineCache';
import { fetchAndValidatePipelineStage, PipelineStage, PromotePipelineResult, validateTestFlags } from '../common';
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

export type PromoteOptions = {
  fullDeploy: boolean;
  testLevel: string;
  runTests: string;
  undeployedOnly: boolean;
  checkDeploy: boolean;
  deploymentId: string;
};
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
  protected sourceStageId: string;
  protected deployOptions: Partial<PromoteOptions>;
  private projectId: string;

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
    const pipelineStage: PipelineStage = await fetchAndValidatePipelineStage(
      doceOrg,
      this.flags['devops-center-project-name'],
      this.flags['branch-name']
    );
    this.projectId = pipelineStage.sf_devops__Pipeline__r.sf_devops__Project__c;
    this.computeSourceStageId(pipelineStage);
    const asyncOperationId: string = await this.requestPromotion(doceOrg);

    if (this.flags.async) {
      await DeployPipelineCache.set(asyncOperationId, {});
      // TODO display async message
    }

    // TODO: move this to logger service
    this.log(`Job ID: ${asyncOperationId}`);

    return { jobId: asyncOperationId };
  }

  private async requestPromotion(targetOrg: Org): Promise<string> {
    const req: HttpRequest = {
      method: 'POST',
      url: `${REST_PROMOTE_BASE_URL as string}${this.projectId}/pipelineName/${this.sourceStageId}`,
      body: JSON.stringify({
        changeBundleName: this.flags['bundle-version-name'],
        promoteOptions: this.buildPromoteOptions(),
      }),
    };
    return targetOrg.getConnection().request(req);
  }

  private buildPromoteOptions(): Partial<PromoteOptions> {
    // set base promote options
    this.deployOptions = {
      fullDeploy: this.flags['deploy-all'],
      testLevel: this.flags['test-level'] ?? 'Default',
      runTests: this.flags['tests'] ? this.flags['tests'].join(',') : undefined,
    };
    // ask concrete implementation to add more promote options if needed
    this.addPromoteOptions();
    return this.deployOptions;
  }

  /**
   * Knows how to compute the target pipeline stage Id based on the type of promotion.
   */
  protected abstract computeSourceStageId(pipelineStage: PipelineStage): void;

  /**
   * Allows concrete implementations to add promote optiones on top of the base ones
   */
  protected abstract addPromoteOptions(): void;
}
