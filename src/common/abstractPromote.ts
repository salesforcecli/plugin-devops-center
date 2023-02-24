/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages, Org, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags, Interfaces } from '@oclif/core';
import { HttpRequest, HttpResponse } from 'jsforce';
import { DeployPipelineCache } from '../common/deployPipelineCache';
import AsyncOpStreaming from '../streamer/processors/asyncOpStream';
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
import DoceMonitor from '../streamer/doceMonitor';
import { REST_PROMOTE_BASE_URL, HTTP_CONFLICT_CODE } from './constants';
import { AsyncOperationResult, AsyncOperationStatus } from './types';
import { fetchAsyncOperationResult } from './utils';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

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
    wait,
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
    const asyncOperationId: string = await this.requestPromotionFlow(doceOrg, this.numRetries409);

    // TODO: move this to logger service
    this.log(`Job ID: ${asyncOperationId}`);
    await DeployPipelineCache.set(asyncOperationId, {});

    if (this.flags.async) {
      // TODO display async message
      return {
        jobId: asyncOperationId,
        status: AsyncOperationStatus.InProgress,
      };
    }
    const doceMonitor: DoceMonitor = new AsyncOpStreaming(doceOrg, this.flags.wait, asyncOperationId);
    await doceMonitor.monitor();

    // get final state of the async job
    const asyncJob: AsyncOperationResult = await fetchAsyncOperationResult(doceOrg.getConnection(), asyncOperationId);
    return {
      jobId: asyncOperationId,
      status: asyncJob.sf_devops__Status__c,
      message: asyncJob.sf_devops__Message__c,
      errorDetails: asyncJob.sf_devops__Error_Details__c,
    };
  }

  protected async requestPromotionFlow(doceOrg: Org, numRetries: number): Promise<string> {
    let asyncOperationId: string;
    try {
      asyncOperationId = await this.requestPromotion(doceOrg);
    } catch (error) {
      const err = error as HttpResponse;
      // if we get anything besides a 409 we rethrow the error
      if (err['errorCode'] !== HTTP_CONFLICT_CODE) {
        throw error;
      }
      this.spinner.start('Synchronization of source control system events in progress');
      asyncOperationId = await this.retryRequestPromotion(doceOrg, numRetries);
      this.spinner.stop();
    }
    return asyncOperationId;
  }

  protected async retryRequestPromotion(doceOrg: Org, numRetries: number): Promise<string> {
    try {
      const asyncOperationId: string = await this.requestPromotion(doceOrg);
      return asyncOperationId;
    } catch (error) {
      const err = error as HttpResponse;
      // if we get anything besdies a 409 or run out of retries we throw an error
      if (err['errorCode'] !== HTTP_CONFLICT_CODE || numRetries < 1) {
        this.spinner.stop();
        throw error;
      }
      return this.retryRequestPromotion(doceOrg, numRetries - 1);
    }
  }

  protected getTargetStage(): PipelineStage {
    return this.targetStage;
  }

  /**
   * Default function for catching commands errors.
   *
   * @param error
   * @returns
   */
  protected catch(error: Error | SfError): Promise<SfCommand.Error> {
    if (error.name.includes('GenericTimeoutError')) {
      const err = messages.createError('error.ClientTimeout', [this.config.bin, this.id]);
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
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
