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

import { Messages, Connection } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import {
  validatePromotion,
  CombineDetails,
  ValidatePromotionResult,
  formatValidationDetails,
  hasSharedComponents,
} from '../../../utils/promotionUtils.js';
import { validateSalesforceId, normalizeSalesforceId } from '../../../utils/soqlUtils.js';
import { resolveProjectIdFromWorkItem } from '../../../utils/prepareWorkItem.js';
import { getPipelineIdForProject, fetchPipelineStages, computeFirstStageId } from '../../../utils/pipelineUtils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.promotion.validate');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

/**
 * Combine details describe how work items that share components could be merged before promotion.
 * We request them regardless of work-item count, except when promoting to the pipeline's first
 * stage: those work items come straight from dev branches and have no source stage, so Core's
 * combine-details path NPEs on a null source stage.
 */
async function shouldCheckCombineDetails(
  connection: Connection,
  pipelineId: string,
  targetStageId: string
): Promise<boolean> {
  const stages = await fetchPipelineStages(connection, pipelineId);
  const firstStageId = computeFirstStageId(stages);
  const promotingToFirstStage =
    Boolean(firstStageId) && normalizeSalesforceId(targetStageId) === normalizeSalesforceId(firstStageId!);
  return !promotingToFirstStage;
}

export type PromotionValidateResult = {
  success: boolean;
  errorType: string | null;
  errorDetails: string | null;
  combineDetails: CombineDetails | null;
  suggestions: string[];
};

export default class DevopsPromotionValidate extends SfCommand<PromotionValidateResult> {
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
      required: true,
      multiple: true,
      startsWith: '1fk',
    }),
  };

  public async run(): Promise<PromotionValidateResult> {
    const { flags } = await this.parse(DevopsPromotionValidate);
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const targetStageId = flags['target-stage-id'];
    const workItemIds = flags['work-item-id'];

    validateSalesforceId(targetStageId, 'target stage');
    for (const id of workItemIds) {
      validateSalesforceId(id, 'work item');
    }

    let pipelineId: string;
    try {
      const { projectId } = await resolveProjectIdFromWorkItem(connection, workItemIds[0]);
      const pid = await getPipelineIdForProject(connection, projectId);
      if (!pid) {
        this.error(messages.getMessage('error.NoPipeline', [workItemIds[0]]));
      }
      pipelineId = pid;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    const checkCombineDetails = await shouldCheckCombineDetails(connection, pipelineId, targetStageId);

    let result: ValidatePromotionResult;
    try {
      result = await validatePromotion(connection, pipelineId, workItemIds, targetStageId, checkCombineDetails);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      const cleanMsg = errMsg.split('<')[0].trim();
      this.error(messages.getMessage('error.ValidationRequestFailed', [cleanMsg]));
    }

    if (!result.success) {
      this.error(
        messages.getMessage('error.ValidationFailed', [
          result.errorType ?? '',
          formatValidationDetails(result.errorDetails),
        ])
      );
    }

    this.log(`Success:      ${result.success}`);
    if (result.combineDetails) {
      this.log('Combine Details:');
      this.log(JSON.stringify(result.combineDetails, null, 2));
    }

    // Validation succeeded, which means a pull request already exists for each work item, so they
    // can be promoted directly. When the work items also share components, the user has two choices:
    //   1. combine them and promote the combined parent as a single unit, or
    //   2. promote them as they are, without combining.
    const suggestions: string[] = [];
    if (hasSharedComponents(result.combineDetails)) {
      suggestions.push(messages.getMessage('suggestion.SharedComponents'));

      // Option 1 — combine + promote. combineDetails carries the parent/child IDs to combine.
      const parentId = result.combineDetails?.parentWorkitemId;
      const childIds = result.combineDetails?.childWorkitemsId ?? [];
      if (parentId && childIds.length > 0) {
        const combineArgs = [
          `--parent-work-item-id ${parentId}`,
          ...childIds.map((id) => `--child-work-item-id ${id}`),
          `--target-stage-id ${targetStageId}`,
        ].join(' ');
        suggestions.push(messages.getMessage('suggestion.CombineOption'));
        suggestions.push(
          messages.getMessage('suggestion.CombineStepPrepare', [`sf devops work-item combine ${combineArgs}`])
        );
        // Combine merges the children into the parent, so only the parent is promoted.
        suggestions.push(
          messages.getMessage('suggestion.CombineStepPromote', [
            `sf devops promote --work-item-id ${parentId} --target-stage-id ${targetStageId}`,
          ])
        );
      }

      // Option 2 — promote the work items as-is. Their PRs already exist (validation passed).
      const promoteArgs = [
        ...workItemIds.map((id) => `--work-item-id ${id}`),
        `--target-stage-id ${targetStageId}`,
      ].join(' ');
      suggestions.push(messages.getMessage('suggestion.PromoteOption'));
      suggestions.push(messages.getMessage('suggestion.PromoteStep', [`sf devops promote ${promoteArgs}`]));

      this.log('');
      this.log('Suggestions:');
      suggestions.forEach((s) => this.log(`  ${s}`));
    }

    return {
      success: result.success,
      errorType: result.errorType,
      errorDetails: result.errorDetails,
      combineDetails: result.combineDetails,
      suggestions,
    };
  }
}
