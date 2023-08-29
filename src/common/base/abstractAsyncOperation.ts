/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages, Org, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Duration } from '@salesforce/kit';
import { DeployPipelineCache } from '../deployPipelineCache';
import DoceMonitor from '../../streamer/doceMonitor';
import { AsyncOperationResult, AsyncOperationResultJson, AsyncOperationStatus } from '../types';
import { fetchAsyncOperationResult, getAsyncOperationStreamer } from '../../common';
import { PromoteOutputService } from '../outputService';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export abstract class AsyncCommand extends SfCommand<AsyncOperationResultJson> {
  protected targetOrg: Org;
  private asyncOperationId: string;
  private outputService: PromoteOutputService;

  protected abstract baseCommand: string;

  protected setAsyncOperationId(aorId: string): void {
    this.asyncOperationId = aorId;
  }

  protected setOutputService(service: PromoteOutputService): void {
    this.outputService = service;
  }

  /**
   * Method to handle an in progress async operation. It stores the AOR in cache,
   * then monitors the state of it and print messages if needed. Finally returns the
   * final state of the operation.
   */
  protected async monitorOperation(isAsync: boolean, wait: Duration): Promise<AsyncOperationResultJson> {
    await this.cacheOperation();
    this.outputService.setAorId(this.asyncOperationId);
    this.outputService.printAorId();
    this.outputService.printOpSummary();

    if (isAsync) {
      return this.getOperationState();
    }

    await this.startMonitoring(wait);
    if (this.outputService.getStatus() === AsyncOperationStatus.Completed) {
      this.outputService.displayEndResults();
    }
    return this.getOperationState();
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

  /**
   *
   * Stores the AOR Id in cache.
   */
  protected async cacheOperation(): Promise<void> {
    await DeployPipelineCache.set(this.asyncOperationId, {});
  }

  /**
   *
   * Executes a query to get the state of the AOR record.
   */
  private async getOperationState(): Promise<AsyncOperationResultJson> {
    const asyncJob: AsyncOperationResult = await fetchAsyncOperationResult(
      this.targetOrg.getConnection(),
      this.asyncOperationId
    );
    return {
      jobId: this.asyncOperationId,
      status: asyncJob.sf_devops__Status__c as string,
      message: asyncJob.sf_devops__Message__c as string,
      errorDetails: asyncJob.sf_devops__Error_Details__c as string,
    };
  }

  /**
   * Watch changes in the state of the AOR.
   *
   * @param wait
   */
  private async startMonitoring(wait: Duration): Promise<void> {
    const asyncJob: AsyncOperationResult = await fetchAsyncOperationResult(
      this.targetOrg.getConnection(),
      this.asyncOperationId
    );
    if (
      asyncJob.sf_devops__Status__c === undefined ||
      asyncJob.sf_devops__Status__c === AsyncOperationStatus.InProgress
    ) {
      const streamer: DoceMonitor = getAsyncOperationStreamer(
        this.targetOrg,
        wait,
        this.asyncOperationId,
        this.outputService
      );
      await streamer.monitor();
    } else {
      this.outputService.printAorStatus(asyncJob);
    }
  }
}
