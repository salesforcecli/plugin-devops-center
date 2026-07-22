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

import { Connection, Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { promoteStage, PromoteStageResult } from '../../utils/promoteStage.js';
import { resolveProjectIdFromWorkItem } from '../../utils/prepareWorkItem.js';
import { getPipelineIdForProject } from '../../utils/pipelineUtils.js';
import { deployAll, testLevel as testLevelFlag, specificTestsNoChar } from '../../common/flags/promote/promoteFlags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.promote');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type PromoteResult = {
  requestId: string;
  status: string;
  message: string;
  promotedWorkitemIds: string[];
};

export default class DevopsPromote extends SfCommand<PromoteResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'target-stage-id': Flags.salesforceId({
      char: 't',
      summary: messages.getMessage('flags.target-stage-id.summary'),
      required: true,
      startsWith: '1QV',
    }),
    'work-item-id': Flags.salesforceId({
      char: 'i',
      summary: messages.getMessage('flags.work-item-id.summary'),
      description: messages.getMessage('flags.work-item-id.description'),
      required: false,
      multiple: true,
      startsWith: '1fk',
    }),
    'deploy-all': deployAll,
    'test-level': testLevelFlag(),
    tests: specificTestsNoChar,
  };

  private static async resolvePipelineIdFromStage(connection: Connection, targetStageId: string): Promise<string> {
    const result = await connection.query<{ DevopsPipelineId: string }>(
      `SELECT DevopsPipelineId FROM DevopsPipelineStage WHERE Id = '${targetStageId}' LIMIT 1`
    );
    const pipelineId = result.records[0]?.DevopsPipelineId;
    if (!pipelineId) {
      throw new Error(`Stage '${targetStageId}' not found or has no associated pipeline.`);
    }
    return pipelineId;
  }

  private static async fetchStageWorkItems(
    connection: Connection,
    pipelineId: string,
    targetStageId: string
  ): Promise<string[]> {
    if (!/^[a-zA-Z0-9]{15,18}$/.test(pipelineId)) {
      throw new Error('Invalid pipeline ID format.');
    }

    const sourceStageResult = await connection.query<{ Id: string }>(
      `SELECT Id FROM DevopsPipelineStage WHERE DevopsPipelineId = '${pipelineId}' AND NextStageId = '${targetStageId}' LIMIT 1`
    );
    const sourceStageId = sourceStageResult.records[0]?.Id;
    if (!sourceStageId) {
      throw new Error(`No source stage found that feeds into stage '${targetStageId}'.`);
    }
    if (!/^[a-zA-Z0-9]{15,18}$/.test(sourceStageId)) {
      throw new Error('Invalid source stage ID format.');
    }

    const workItemResult = await connection.query<{ Id: string }>(
      `SELECT Id FROM WorkItem WHERE DevopsPipelineStageId = '${sourceStageId}' LIMIT 200`
    );
    return workItemResult.records.map((r) => r.Id);
  }

  public async run(): Promise<PromoteResult> {
    const { flags } = await this.parse(DevopsPromote);
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const targetStageId = flags['target-stage-id'];
    const workItemIds = flags['work-item-id'];

    let pipelineId: string;
    let resolvedWorkItemIds: string[];

    if (workItemIds?.length) {
      const { projectId } = await resolveProjectIdFromWorkItem(connection, workItemIds[0]);
      const pid = await getPipelineIdForProject(connection, projectId);
      if (!pid) {
        this.error(
          `No pipeline found for work item "${workItemIds[0]}". Ensure the project has an associated pipeline.`
        );
      }
      pipelineId = pid;
      resolvedWorkItemIds = workItemIds;
    } else {
      pipelineId = await DevopsPromote.resolvePipelineIdFromStage(connection, targetStageId);
      resolvedWorkItemIds = await DevopsPromote.fetchStageWorkItems(connection, pipelineId, targetStageId);
      if (resolvedWorkItemIds.length === 0) {
        this.error(messages.getMessage('error.NoWorkItems'));
      }
    }

    let apiResult: PromoteStageResult;
    try {
      apiResult = await promoteStage({
        connection,
        pipelineId,
        workItemIds: resolvedWorkItemIds,
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

    this.log(`Status: ${apiResult.status}`);
    this.log(`Message: ${apiResult.message}`);
    this.log(`Request ID: ${apiResult.requestId}`);
    this.log('');
    this.log('Promoted Work Items');
    this.log('───────────────────');
    for (const id of apiResult.promotedWorkitemIds) {
      this.log(id);
    }

    return {
      requestId: apiResult.requestId,
      status: apiResult.status,
      message: apiResult.message,
      promotedWorkitemIds: apiResult.promotedWorkitemIds,
    };
  }
}
