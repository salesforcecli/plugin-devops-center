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
import {
  getUndeployedWorkItems,
  validateDeploy,
  executeDeploy,
  DeployStageResult,
} from '../../../utils/deployStage.js';
import { deployAll, testLevel, specificTestsNoChar } from '../../../common/flags/promote/promoteFlags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.promotion.complete');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type PromotionCompleteResult = DeployStageResult & {
  undeployedWorkitemIds: string[];
};

export default class DevopsPromotionComplete extends SfCommand<PromotionCompleteResult> {
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
      required: false,
      multiple: true,
      startsWith: '1fk',
    }),
    'deploy-all': deployAll,
    'test-level': testLevel(),
    tests: specificTestsNoChar,
  };

  public async run(): Promise<PromotionCompleteResult> {
    const { flags } = await this.parse(DevopsPromotionComplete);
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const targetStageId = flags['target-stage-id'];
    const workItemIds = flags['work-item-id'];

    let pipelineId: string;
    try {
      const stageResult = await connection.query<{ DevopsPipelineId: string }>(
        `SELECT DevopsPipelineId FROM DevopsPipelineStage WHERE Id = '${targetStageId}' LIMIT 1`
      );
      const id = stageResult.records[0]?.DevopsPipelineId;
      if (!id) {
        this.error(messages.getMessage('error.StageNotFound', [targetStageId]));
      }
      pipelineId = id;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    // When --work-item-id is provided, skip discovery and target those IDs directly.
    // When omitted, discover all undeployed work items for the stage.
    let resolvedWorkItemIds: string[];
    if (workItemIds?.length) {
      resolvedWorkItemIds = workItemIds;
    } else {
      const { undeployedWorkitemIds } = await getUndeployedWorkItems(connection, pipelineId, targetStageId);
      if (undeployedWorkitemIds.length === 0) {
        this.log(messages.getMessage('info.NothingToDeploy'));
        return {
          requestId: '',
          status: 'NoOp',
          message: 'No undeployed work items found for this stage.',
          promotedWorkitemIds: [],
          undeployedWorkitemIds: [],
        };
      }
      resolvedWorkItemIds = undeployedWorkitemIds;
    }

    const validation = await validateDeploy(connection, pipelineId, resolvedWorkItemIds, targetStageId);
    if (!validation.success) {
      this.error(
        messages.getMessage('error.ValidationFailed', [validation.errorType ?? '', validation.errorDetails ?? ''])
      );
    }

    let result: DeployStageResult;
    try {
      result = await executeDeploy(
        connection,
        pipelineId,
        targetStageId,
        flags['deploy-all'],
        flags['test-level'],
        flags.tests,
        workItemIds?.length ? resolvedWorkItemIds : undefined
      );
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      const cleanMsg = errMsg.split('<')[0].trim();
      this.error(messages.getMessage('error.DeployFailed', [cleanMsg]));
    }

    this.log(`Status:     ${result.status}`);
    this.log(`Message:    ${result.message}`);
    this.log(`Request ID: ${result.requestId}`);

    return { ...result, undeployedWorkitemIds: resolvedWorkItemIds };
  }
}
