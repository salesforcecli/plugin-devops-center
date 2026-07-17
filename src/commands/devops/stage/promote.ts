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
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { promoteStage, PromoteStageResult } from '../../../utils/promoteStage.js';
import { deployAll, testLevel, specificTestsNoChar } from '../../../common/flags/promote/promoteFlags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.stage.promote');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type PromoteStageCommandResult = {
  requestId: string;
  status: string;
  message: string;
  promotedWorkitemIds: string[];
};

export default class DevopsStagePromote extends SfCommand<PromoteStageCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'target-stage-id': Flags.salesforceId({
      char: 't',
      summary: messages.getMessage('flags.target-stage-id.summary'),
      required: true,
      startsWith: '1QV',
    }),
    'deploy-all': deployAll,
    'test-level': testLevel(),
    tests: specificTestsNoChar,
  };

  public async run(): Promise<PromoteStageCommandResult> {
    const { flags } = await this.parse(DevopsStagePromote);
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const targetStageId = flags['target-stage-id'];

    // Get pipelineId directly from the target stage
    const stageResult = await connection.query<{ DevopsPipelineId: string }>(
      `SELECT DevopsPipelineId FROM DevopsPipelineStage WHERE Id = '${targetStageId}' LIMIT 1`
    );
    const pipelineId = stageResult.records[0]?.DevopsPipelineId;
    if (!pipelineId) {
      this.error(`Stage '${targetStageId}' not found or has no associated pipeline.`);
    }
    // Validate pipelineId format before using in SOQL
    if (!/^[a-zA-Z0-9]{15,18}$/.test(pipelineId)) {
      this.error('Invalid pipeline ID format.');
    }

    // Find the source stage (the one whose NextStageId points to the target stage)
    const sourceStageResult = await connection.query<{ Id: string }>(
      `SELECT Id FROM DevopsPipelineStage WHERE DevopsPipelineId = '${pipelineId}' AND NextStageId = '${targetStageId}' LIMIT 1`
    );
    const sourceStageId = sourceStageResult.records[0]?.Id;
    if (!sourceStageId) {
      this.error(`No source stage found that feeds into stage '${targetStageId}'.`);
    }
    // Validate sourceStageId format before using in SOQL
    if (!/^[a-zA-Z0-9]{15,18}$/.test(sourceStageId)) {
      this.error('Invalid source stage ID format.');
    }

    // Fetch all work items in the source stage — the API enforces promotion eligibility
    const workItemResult = await connection.query<{ Id: string }>(
      `SELECT Id FROM WorkItem WHERE DevopsPipelineStageId = '${sourceStageId}' LIMIT 200`
    );
    const workItemIds = workItemResult.records.map((r) => r.Id);
    if (workItemIds.length === 0) {
      this.error(messages.getMessage('error.NoWorkItems'));
    }

    let apiResult: PromoteStageResult;
    try {
      apiResult = await promoteStage({
        connection,
        pipelineId,
        workItemIds,
        targetStageId,
        fullDeploy: flags['deploy-all'],
        testLevel: flags['test-level'],
        runTests: flags.tests,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      const cleanMsg = errMsg.split('<')[0].trim();
      this.error(messages.getMessage('error.PromoteFailed', [cleanMsg]));
    }

    this.printOutput(apiResult);

    return {
      requestId: apiResult.requestId,
      status: apiResult.status,
      message: apiResult.message,
      promotedWorkitemIds: apiResult.promotedWorkitemIds,
    };
  }

  private printOutput(result: PromoteStageResult): void {
    this.log(`Status: ${result.status}`);
    this.log(`Message: ${result.message}`);
    this.log(`Request ID: ${result.requestId}`);
    this.log('');
    this.log('Promoted Work Items');
    this.log('───────────────────');
    for (const id of result.promotedWorkitemIds) {
      this.log(id);
    }
  }
}
