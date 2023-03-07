/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages, Org, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags, Interfaces } from '@oclif/core';
import {
  AsyncOperationResult,
  AsyncOperationStatus,
  fetchAsyncOperationResult,
  getAsyncOperationStreamer,
  PromotePipelineResult,
} from '../common';
import { jobId, requiredDoceOrgFlag, useMostRecent, wait } from '../common/flags';
import DoceMonitor from '../streamer/doceMonitor';
import { DeployPipelineCache } from './deployPipelineCache';
import { OutputServiceFactory, ResumeOutputService } from './outputService';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

/**
 * Helper to determine if an operation has finished and therefore is not resumable
 *
 * @param status status of the async operation
 * @returns true if the operation has finished
 */
export function isNotResumable(status: AsyncOperationStatus): boolean {
  return [AsyncOperationStatus.Completed, AsyncOperationStatus.Error, AsyncOperationStatus.Ignored].includes(status);
}

export type Flags<T extends typeof SfCommand> = Interfaces.InferredFlags<
  (typeof ResumeCommand)['baseFlags'] & T['flags']
>;

/**
 *
 * Base class with the common logic to resume an in progress opeation
 */

export abstract class ResumeCommand<T extends typeof SfCommand> extends SfCommand<PromotePipelineResult> {
  // common flags that can be inherited by any command that extends ResumeCommand
  public static baseFlags = {
    'devops-center-username': requiredDoceOrgFlag(),
    'job-id': jobId,
    'use-most-recent': useMostRecent,
    wait,
  };

  protected flags!: Flags<T>;

  private outputService: ResumeOutputService;

  protected abstract operationType: string;
  protected abstract baseCommand: string;

  public async init(): Promise<void> {
    await super.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof ResumeCommand).baseFlags,
    }); // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.flags = flags as Flags<T>;
    this.outputService = new OutputServiceFactory().forResume(this.operationType);
  }

  protected async resumeOperation(): Promise<PromotePipelineResult> {
    const asyncJobId: string = this.flags['use-most-recent']
      ? (await DeployPipelineCache.create()).getLatestKeyOrThrow()
      : (this.flags['job-id'] as string);

    // get the latest state of the async job and validate that it's resumable
    const doceOrg: Org = this.flags['devops-center-username'] as Org;
    let asyncJob: AsyncOperationResult = await fetchAsyncOperationResult(doceOrg.getConnection(), asyncJobId);
    if (asyncJob.sf_devops__Status__c && isNotResumable(asyncJob.sf_devops__Status__c)) {
      throw messages.createError('error.JobNotResumable', [asyncJobId, asyncJob.sf_devops__Status__c]);
    }

    // it is resumable so we can start monitoring the operation
    this.outputService.setAorId(asyncJobId);

    this.outputService.printOpSummary();
    this.outputService.printAorId();

    const streamer: DoceMonitor = getAsyncOperationStreamer(doceOrg, this.flags.wait, asyncJobId, this.outputService);
    await streamer.monitor();

    // get final state of the async job
    asyncJob = await fetchAsyncOperationResult(doceOrg.getConnection(), asyncJobId);
    return {
      jobId: asyncJobId,
      status: asyncJob.sf_devops__Status__c,
      message: asyncJob.sf_devops__Message__c,
      errorDetails: asyncJob.sf_devops__Error_Details__c,
    };
  }

  /**
   * Default function for catching commands errors.
   *
   * @param error
   * @returns
   */
  protected catch(error: Error | SfError): Promise<SfCommand.Error> {
    if (error.name.includes('GenericTimeoutError')) {
      const err = messages.createError('error.ClientTimeout', [this.config.bin, this.baseCommand]);
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }
}
