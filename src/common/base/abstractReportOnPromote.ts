/*
 * Copyright 2026, Salesforce, Inc.
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
import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { DeployPipelineCache } from '../../common/deployPipelineCache';
import { PromotePipelineResult } from '../../common';
import { requiredDoceOrgFlag } from '../../common/flags/flags';
import { DeploymentResult } from './../types';
import { selectOneDeploymentResultByAsyncJobId } from './../selectors/deploymentResultsSelector';
import { OutputService } from './../outputService/outputService';
import { OutputServiceFactory } from './../outputService/outputServiceFactory';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type Flags<T extends typeof SfCommand> = Interfaces.InferredFlags<
  (typeof ReportOnPromoteCommand)['baseFlags'] & T['flags']
>;

export abstract class ReportOnPromoteCommand<T extends typeof SfCommand> extends SfCommand<PromotePipelineResult> {
  public static readonly enableJsonFlag = true;
  public static baseFlags = {
    'devops-center-username': requiredDoceOrgFlag(),
  };
  protected flags!: Flags<T>;
  protected abstract operationName: string;

  public async init(): Promise<void> {
    await super.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof ReportOnPromoteCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.flags = flags as Flags<T>;
  }

  /**
   * Prints a report of an async operation.
   */
  protected async getOperationReport(): Promise<PromotePipelineResult> {
    const asyncJobId = this.flags['use-most-recent']
      ? (await DeployPipelineCache.create()).getLatestKeyOrThrow()
      : (this.flags['job-id'] as string);
    const org = this.flags['devops-center-username'];

    // query the deployment result related to the promote operation.
    const operationResult: DeploymentResult | null = await selectOneDeploymentResultByAsyncJobId(
      org.getConnection(),
      asyncJobId
    );
    if (operationResult && !this.jsonEnabled()) {
      const displayer: OutputService = new OutputServiceFactory().forPromotionReport(
        this.flags,
        operationResult,
        this.operationName
      );
      displayer.printOpSummary();
    } else if (!operationResult) {
      throw messages.createError('error.InvalidAorId', [asyncJobId]);
    }

    return {
      jobId: asyncJobId,
      status: operationResult.sf_devops__Status__r.sf_devops__Status__c,
      message: operationResult.sf_devops__Status__r.sf_devops__Message__c,
      errorDetails: operationResult.sf_devops__Status__r.sf_devops__Error_Details__c,
    };
  }
}
