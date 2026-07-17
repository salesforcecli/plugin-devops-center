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
import { combineWorkItemsPrepare, CombineWorkItemsPrepareResult } from '../../../../utils/combineWorkItems.js';
import { getPipelineIdForProject } from '../../../../utils/pipelineUtils.js';
import { resolveProjectIdFromWorkItem } from '../../../../utils/prepareWorkItem.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.combine.prepare');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsWorkItemCombinePrepare extends SfCommand<CombineWorkItemsPrepareResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'parent-work-item-id': Flags.salesforceId({
      summary: messages.getMessage('flags.parent-work-item-id.summary'),
      description: messages.getMessage('flags.parent-work-item-id.description'),
      required: true,
      startsWith: '1fk',
      char: undefined,
    }),
    'child-work-item-id': Flags.salesforceId({
      summary: messages.getMessage('flags.child-work-item-id.summary'),
      description: messages.getMessage('flags.child-work-item-id.description'),
      required: true,
      multiple: true,
      startsWith: '1fk',
      char: undefined,
    }),
    'target-stage-id': Flags.salesforceId({
      summary: messages.getMessage('flags.target-stage-id.summary'),
      char: 't',
      required: true,
      startsWith: '1QV',
    }),
  };

  public async run(): Promise<CombineWorkItemsPrepareResult> {
    const { flags } = await this.parse(DevopsWorkItemCombinePrepare);
    const org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const parentWorkItemId = flags['parent-work-item-id'];
    const childWorkItemIds = flags['child-work-item-id'];

    let pipelineId: string | undefined;
    let sourceStageId: string;
    try {
      const { projectId, pipelineStageId } = await resolveProjectIdFromWorkItem(connection, parentWorkItemId);
      sourceStageId = pipelineStageId;
      pipelineId = await getPipelineIdForProject(connection, projectId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (!pipelineId) {
      this.error(messages.getMessage('error.NoPipeline'));
    }

    let result: CombineWorkItemsPrepareResult;
    try {
      result = await combineWorkItemsPrepare({
        connection,
        pipelineId,
        parentWorkItemId,
        childWorkItemIds,
        sourceStageId,
        targetStageId: flags['target-stage-id'],
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      this.log('Work items prepared for custom promotion.');
      this.log(`  Request Token: ${result.requestToken ?? ''}`);
      this.log('');
      this.log('To complete the promotion, run:');
      this.log(
        `  sf devops work-item promote --target-org ${
          org.getUsername() ?? '<org>'
        } --work-item-id ${parentWorkItemId} --target-stage-id ${flags['target-stage-id']}`
      );
    } else {
      this.log('Failed to prepare work items for custom promotion.');
      this.log(`  Error Code:    ${result.errorCode ?? ''}`);
      this.log(`  Error Message: ${result.errorMessage ?? ''}`);
    }

    return result;
  }
}
