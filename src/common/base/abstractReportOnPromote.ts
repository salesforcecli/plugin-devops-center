/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages, Org } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags, Interfaces } from '@oclif/core';
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
    const org = this.flags['devops-center-username'] as Org;

    try {
      // query the deployment result related to the promote operation.
      const operationResult: DeploymentResult = await selectOneDeploymentResultByAsyncJobId(
        org.getConnection(),
        asyncJobId
      );
      if (!this.jsonEnabled()) {
        const displayer: OutputService = new OutputServiceFactory().forPromotionReport(
          this.flags,
          operationResult,
          this.operationName
        );
        displayer.printOpSummary();
      }

      return {
        jobId: asyncJobId,
        status: operationResult.sf_devops__Status__r.sf_devops__Status__c,
        message: operationResult.sf_devops__Status__r.sf_devops__Message__c,
        errorDetails: operationResult.sf_devops__Status__r.sf_devops__Error_Details__c,
      };
    } catch (err) {
      const error = err as Error;
      if (error.name === 'SingleRecordQuery_NoRecords') {
        throw messages.createError('error.InvalidAorId', [asyncJobId]);
      }
      throw err;
    }
  }
}
