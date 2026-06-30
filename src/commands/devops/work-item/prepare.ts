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
  prepareWorkItem,
  PrepareWorkItemResult,
  resolveProjectIdFromWorkItem,
} from '../../../utils/prepareWorkItem.js';
import { getPipelineIdForProject } from '../../../utils/pipelineUtils.js';
import { requiredDoceOrgFlag } from '../../../common/flags/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.prepare');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsWorkItemPrepare extends SfCommand<PrepareWorkItemResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'devops-center-username': requiredDoceOrgFlag(),
    'work-item-id': Flags.string({
      summary: messages.getMessage('flags.work-item-id.summary'),
      char: 'i',
      required: true,
    }),
    'source-stage-id': Flags.string({
      summary: messages.getMessage('flags.source-stage-id.summary'),
      char: 's',
      required: true,
    }),
    'target-stage-id': Flags.string({
      summary: messages.getMessage('flags.target-stage-id.summary'),
      char: 't',
      required: true,
    }),
  };

  public async run(): Promise<PrepareWorkItemResult> {
    const { flags } = await this.parse(DevopsWorkItemPrepare);
    const org = flags['devops-center-username'];
    const connection = org.getConnection();
    const workItemId = flags['work-item-id'];

    let projectId: string;
    try {
      projectId = await resolveProjectIdFromWorkItem(connection, workItemId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    const pipelineId = await getPipelineIdForProject(connection, projectId);
    if (!pipelineId) {
      this.error(`No pipeline found for work item ${workItemId}. Ensure the project has an associated pipeline.`);
    }

    let result: PrepareWorkItemResult;
    try {
      result = await prepareWorkItem({
        connection,
        pipelineId,
        workItemId,
        sourceStageId: flags['source-stage-id'],
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
      this.log(`Work item ${workItemId} prepared for one-off promotion.`);
      this.log(`  Request Token: ${result.requestToken ?? ''}`);
    } else {
      this.log('Failed to prepare work item for one-off promotion.');
      this.log(`  Error Code:    ${result.errorCode ?? ''}`);
      this.log(`  Error Message: ${result.errorMessage ?? ''}`);
    }

    return result;
  }
}
