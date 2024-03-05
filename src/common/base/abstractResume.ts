/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags, Interfaces } from '@oclif/core';
import {
  AsyncOperationResult,
  AsyncOperationResultJson,
  AsyncOperationStatus,
  fetchAsyncOperationResult,
} from '../../common';
import { concise, jobId, requiredDoceOrgFlag, useMostRecent, verbose, wait } from '../../common/flags/flags';
import { DeployPipelineCache } from './../deployPipelineCache';
import { OutputServiceFactory } from './../outputService';
import { AsyncCommand } from './abstractAsyncOperation';

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
 * Base class with the common logic to resume an in progress operation
 */

export abstract class ResumeCommand<T extends typeof SfCommand> extends AsyncCommand {
  public static readonly enableJsonFlag = true;
  // common flags that can be inherited by any command that extends ResumeCommand
  public static baseFlags = {
    'devops-center-username': requiredDoceOrgFlag(),
    'job-id': jobId,
    'use-most-recent': useMostRecent,
    concise,
    verbose,
    wait,
  };

  protected flags!: Flags<T>;

  protected abstract operationType: string;

  public async init(): Promise<void> {
    await super.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof ResumeCommand).baseFlags,
    }); // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.flags = flags as Flags<T>;
    this.setOutputService(
      new OutputServiceFactory().forResume(
        this.flags,
        this.operationType,
        this.flags['devops-center-username'].getConnection()
      )
    );
  }

  protected async resumeOperation(): Promise<AsyncOperationResultJson> {
    const asyncJobId: string = this.flags['use-most-recent']
      ? (await DeployPipelineCache.create()).getLatestKeyOrThrow()
      : (this.flags['job-id'] as string);

    // get the latest state of the async job and validate that it's resumable
    this.targetOrg = this.flags['devops-center-username'];
    const asyncJob: AsyncOperationResult = await fetchAsyncOperationResult(this.targetOrg.getConnection(), asyncJobId);
    if (asyncJob.sf_devops__Status__c && isNotResumable(asyncJob.sf_devops__Status__c)) {
      throw messages.createError('error.JobNotResumable', [asyncJobId, asyncJob.sf_devops__Status__c]);
    }

    this.setAsyncOperationId(asyncJobId);
    return this.monitorOperation(false, this.flags.wait);
  }
}
