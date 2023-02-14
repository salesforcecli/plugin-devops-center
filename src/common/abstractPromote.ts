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
  wait,
} from '../common/flags';
import AsyncOpStreaming from '../streamer/processors/asyncOpStream';
import { REST_PROMOTE_BASE_URL } from './constants';
import { AsyncOperationResult, AsyncOperationStatus } from './types';
import { getAsyncOperationResult } from './utils';

export type Flags<T extends typeof SfCommand> = Interfaces.InferredFlags<
  (typeof PromoteCommand)['globalFlags'] & T['flags']
>;

export function isNotResumable(status: AsyncOperationStatus): boolean {
  return [AsyncOperationStatus.Completed, AsyncOperationStatus.Error, AsyncOperationStatus.Ignored].includes(status);
}

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    wait,
  };
  protected flags!: Flags<T>;
  private targetStage: PipelineStage;
  private sourceStageId: string;
  private deployOptions: Partial<PromoteOptions>;

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
    const asyncOperationId: string = await this.requestPromotion(doceOrg);

    // TODO: move this to logger service
    this.log(`Job ID: ${asyncOperationId}`);
    await DeployPipelineCache.set(asyncOperationId, {});

    if (this.flags.async) {
      // TODO display async message
      return { jobId: asyncOperationId };
    }

    // const streamer: DoceMonitor = new AsyncOpStreaming(doceOrg, this.flags.wait, 'AORID');
    const streamer: AsyncOpStreaming = new AsyncOpStreaming(doceOrg, this.flags.wait, asyncOperationId);
    await streamer.startStreaming();

    const asyncJob: AsyncOperationResult = await getAsyncOperationResult(doceOrg.getConnection(), asyncOperationId);
    return {
      jobId: asyncOperationId,
      status: asyncJob.sf_devops__Status__c,
      message: asyncJob.sf_devops__Message__c,
      errorDetails: asyncJob.sf_devops__Error_Details__c,
    };
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
