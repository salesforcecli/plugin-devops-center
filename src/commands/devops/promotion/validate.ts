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
import { validatePromotion, CombineDetails, ValidatePromotionResult } from '../../../utils/promotionUtils.js';
import { validateSalesforceId } from '../../../utils/soqlUtils.js';
import { resolveProjectIdFromWorkItem } from '../../../utils/prepareWorkItem.js';
import { getPipelineIdForProject } from '../../../utils/pipelineUtils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.promotion.validate');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type PromotionValidateResult = {
  success: boolean;
  errorType: string | null;
  errorDetails: string | null;
  combineDetails: CombineDetails | null;
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
    'check-combine-details': Flags.boolean({
      summary: messages.getMessage('flags.check-combine-details.summary'),
      default: false,
    }),
  };

  public async run(): Promise<PromotionValidateResult> {
    const { flags } = await this.parse(DevopsPromotionValidate);
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const targetStageId = flags['target-stage-id'];
    const workItemIds = flags['work-item-id'];
    const checkCombineDetails = flags['check-combine-details'];

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
      this.error(messages.getMessage('error.ValidationFailed', [result.errorType ?? '', result.errorDetails ?? '']));
    }

    this.log(`Success:      ${result.success}`);
    if (result.combineDetails) {
      this.log('Combine Details:');
      this.log(JSON.stringify(result.combineDetails, null, 2));
    }

    return {
      success: result.success,
      errorType: result.errorType,
      errorDetails: result.errorDetails,
      combineDetails: result.combineDetails,
    };
  }
}
