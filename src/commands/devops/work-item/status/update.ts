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

import { Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import {
  resolveWorkItemByName,
  resolveProjectIdForWorkItem,
  updateWorkItemStatus,
  UpdateWorkItemStatusResult,
  ALLOWED_STATUSES,
} from '../../../../utils/updateWorkItemStatus.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.status.update');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsWorkItemStatusUpdate extends SfCommand<UpdateWorkItemStatusResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'work-item-name': Flags.string({
      summary: messages.getMessage('flags.work-item-name.summary'),
      char: 'n',
      exactlyOne: ['work-item-name', 'work-item-id'],
    }),
    'work-item-id': Flags.salesforceId({
      summary: messages.getMessage('flags.work-item-id.summary'),
      char: 'w',
      exactlyOne: ['work-item-name', 'work-item-id'],
    }),
    status: Flags.string({
      summary: messages.getMessage('flags.status.summary'),
      required: true,
      options: [...ALLOWED_STATUSES],
    }),
  };

  public async run(): Promise<UpdateWorkItemStatusResult> {
    const { flags } = await this.parse(DevopsWorkItemStatusUpdate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);

    let workItemId: string;
    let projectId: string;
    try {
      if (flags['work-item-name']) {
        const ctx = await resolveWorkItemByName(connection, flags['work-item-name']);
        workItemId = ctx.workItemId;
        projectId = ctx.projectId;
      } else {
        workItemId = flags['work-item-id']!;
        projectId = await resolveProjectIdForWorkItem(connection, workItemId);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    let result: UpdateWorkItemStatusResult;
    try {
      result = await updateWorkItemStatus({ connection, workItemId, projectId, status: flags['status'] });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      const identifier = flags['work-item-name'] ?? result.workItemId;
      this.log(`Successfully updated status for work item ${identifier} to "${result.status ?? flags['status']}".`);
    } else {
      this.error(`Failed to update work item status: ${result.error ?? ''}`);
    }

    return result;
  }
}
