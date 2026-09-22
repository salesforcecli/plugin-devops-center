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
import {
  promoteStage,
  PromoteStageResult,
  findInFlightPromotions,
  InFlightPromotion,
} from '../../utils/promoteStage.js';
import { resolveProjectIdFromWorkItem } from '../../utils/prepareWorkItem.js';
import { getPipelineIdForProject } from '../../utils/pipelineUtils.js';
import { deployAll, testLevel as testLevelFlag, specificTestsNoChar } from '../../common/flags/promote/promoteFlags.js';
import { validateSalesforceId } from '../../utils/soqlUtils.js';
import {
  validatePromotion,
  CombineDetails,
  ValidatePromotionResult,
  formatValidationDetails,
} from '../../utils/promotionUtils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.promote');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type PromoteResult = {
  requestId: string;
  status: string;
  message: string;
  promotedWorkitemIds: string[];
  combineDetails?: CombineDetails | null;
};

const PROMOTABLE_STATUSES = ['READY_TO_PROMOTE', 'PROMOTED'] as const;
const PROMOTABLE_STATUS_LIST = PROMOTABLE_STATUSES.join("', '");

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
      exclusive: ['stage-id'],
    }),
    'stage-id': Flags.salesforceId({
      char: 's',
      summary: messages.getMessage('flags.stage-id.summary'),
      required: false,
      startsWith: '1QV',
      exclusive: ['work-item-id'],
    }),
    'deploy-all': deployAll,
    'test-level': testLevelFlag(),
    tests: specificTestsNoChar,
    'skip-validation': Flags.boolean({
      summary: messages.getMessage('flags.skip-validation.summary'),
      default: false,
    }),
    force: Flags.boolean({
      summary: messages.getMessage('flags.force.summary'),
      default: false,
    }),
  };

  private static async assertWorkItemsPromotable(connection: Connection, workItemIds: string[]): Promise<string[]> {
    const idList = workItemIds.map((id) => `'${id}'`).join(', ');
    const result = await connection.query<{ Id: string; Status: string }>(
      `SELECT Id, Status FROM WorkItem WHERE Id IN (${idList})`
    );
    const ineligible = result.records.filter((r) => !(PROMOTABLE_STATUSES as readonly string[]).includes(r.Status));
    if (ineligible.length > 0) {
      const details = ineligible.map((r) => `${r.Id} (${r.Status})`).join(', ');
      throw new Error(
        `The following work items are not eligible for promotion: ${details}. Only work items with status READY_TO_PROMOTE or PROMOTED can be promoted.`
      );
    }
    return result.records.map((r) => r.Id);
  }

  private static async fetchStageWorkItems(
    connection: Connection,
    pipelineId: string,
    sourceStageId: string,
    targetStageId: string
  ): Promise<string[]> {
    // Validate all IDs before using in SOQL
    validateSalesforceId(pipelineId, 'pipeline');
    validateSalesforceId(sourceStageId, 'source stage');
    validateSalesforceId(targetStageId, 'target stage');

    // Verify the source stage feeds into the target stage
    const stageResult = await connection.query<{ NextStageId: string }>(
      `SELECT NextStageId FROM DevopsPipelineStage WHERE Id = '${sourceStageId}' AND DevopsPipelineId = '${pipelineId}' LIMIT 1`
    );
    const nextStageId = stageResult.records[0]?.NextStageId;
    if (!nextStageId) {
      throw new Error(`Stage '${sourceStageId}' not found in the pipeline or has no next stage.`);
    }
    if (nextStageId !== targetStageId) {
      throw new Error(`Stage '${sourceStageId}' does not feed into target stage '${targetStageId}'.`);
    }

    const workItemResult = await connection.query<{ Id: string }>(
      `SELECT Id FROM WorkItem WHERE DevopsPipelineStageId = '${sourceStageId}' AND Status IN ('${PROMOTABLE_STATUS_LIST}') LIMIT 200`
    );
    return workItemResult.records.map((r) => r.Id);
  }

  public async run(): Promise<PromoteResult> {
    const { flags } = await this.parse(DevopsPromote);
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const targetStageId = flags['target-stage-id'];
    const workItemIds = flags['work-item-id'];
    const sourceStageId = flags['stage-id'];

    if (!workItemIds?.length && !sourceStageId) {
      this.error(messages.getMessage('error.NoModeFlag'));
    }

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
      resolvedWorkItemIds = await DevopsPromote.assertWorkItemsPromotable(connection, workItemIds);
    } else {
      // Stage path: resolve pipelineId from the source stage
      const sid = sourceStageId!;
      validateSalesforceId(sid, 'source stage');
      const stageQueryResult = await connection.query<{ DevopsPipelineId: string }>(
        `SELECT DevopsPipelineId FROM DevopsPipelineStage WHERE Id = '${sid}' LIMIT 1`
      );
      const pid = stageQueryResult.records[0]?.DevopsPipelineId;
      if (!pid) {
        this.error(`Stage '${sid}' not found or has no associated pipeline.`);
      }
      pipelineId = pid;
      resolvedWorkItemIds = await DevopsPromote.fetchStageWorkItems(connection, pipelineId, sid, targetStageId);
      if (resolvedWorkItemIds.length === 0) {
        this.error(messages.getMessage('error.NoWorkItems'));
      }
    }

    if (!flags.force) {
      await this.assertNoInFlightPromotion(connection, targetStageId);
    }

    if (!flags['skip-validation']) {
      await this.runValidation(connection, pipelineId, resolvedWorkItemIds, targetStageId, !workItemIds?.length);
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
      const htmlStripped = errMsg.split('<')[0].trim();
      const cleanMsg = htmlStripped.replace(/^[A-Z][A-Z0-9_]+:/, '').trim();
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

  /**
   * Blocks promotion if another promotion to the same target stage is already in flight, to
   * avoid creating a duplicate. Scoped to the target stage (and therefore its pipeline), so
   * promotions in other stages or pipelines are unaffected. Best-effort: if the check can't
   * run, the promotion proceeds as before.
   */
  private async assertNoInFlightPromotion(connection: Connection, targetStageId: string): Promise<void> {
    let inFlight: InFlightPromotion[];
    try {
      inFlight = await findInFlightPromotions(connection, targetStageId);
    } catch {
      // Guard failure must not break the existing promote flow.
      return;
    }
    if (inFlight.length > 0) {
      const tokens = inFlight.map((p) => p.requestToken).filter(Boolean);
      const plural = tokens.length > 1 ? 's' : '';
      this.error(messages.getMessage('error.PromotionInFlight', [plural, tokens.join(', '), this.config.bin]));
    }
  }

  private async runValidation(
    connection: Connection,
    pipelineId: string,
    workItemIds: string[],
    targetStageId: string,
    allWorkItemsInStage = false
  ): Promise<void> {
    let result: ValidatePromotionResult;
    try {
      result = await validatePromotion(connection, pipelineId, workItemIds, targetStageId, false, allWorkItemsInStage);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      const htmlStripped = errMsg.split('<')[0].trim();
      const cleanMsg = htmlStripped.replace(/^[A-Z][A-Z0-9_]+:/, '').trim();
      this.error(messages.getMessage('error.ValidationRequestFailed', [cleanMsg]));
    }

    if (!result.success) {
      if (result.combineDetails) {
        this.log(messages.getMessage('error.ValidationFailedCombineRequired'));
        this.log(JSON.stringify(result.combineDetails, null, 2));
      }
      this.error(
        messages.getMessage('error.ValidationFailed', [
          result.errorType ?? '',
          formatValidationDetails(result.errorDetails),
        ])
      );
    }
  }
}
