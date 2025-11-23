/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
  public static readonly enableJsonFlag = true;
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
    if (error.name && error.name.includes('GenericTimeoutError')) {
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
