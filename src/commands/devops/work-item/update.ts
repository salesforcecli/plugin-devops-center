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
  updateWorkItem,
  UpdateWorkItemResult,
  ALLOWED_STATUSES,
} from '../../../utils/updateWorkItem.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.update');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsWorkItemUpdate extends SfCommand<UpdateWorkItemResult> {
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
    subject: Flags.string({
      summary: messages.getMessage('flags.subject.summary'),
    }),
    description: Flags.string({
      summary: messages.getMessage('flags.description.summary'),
    }),
    status: Flags.string({
      summary: messages.getMessage('flags.status.summary'),
      options: [...ALLOWED_STATUSES],
    }),
  };

  public async run(): Promise<UpdateWorkItemResult> {
    const { flags } = await this.parse(DevopsWorkItemUpdate);

    if (!flags['subject'] && !flags['description'] && !flags['status']) {
      this.error(messages.getMessage('error.NoFieldsProvided'));
    }

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

    let result: UpdateWorkItemResult;
    try {
      result = await updateWorkItem({
        connection,
        workItemId,
        projectId,
        status: flags['status'],
        subject: flags['subject'],
        description: flags['description'],
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      const identifier = flags['work-item-name'] ?? workItemId;
      this.log(`Successfully updated work item ${identifier}.`);
      if (result.subject !== undefined) this.log(`  Subject:     ${result.subject}`);
      if (result.description !== undefined) this.log(`  Description: ${result.description}`);
      if (result.status !== undefined) this.log(`  Status:      ${result.status}`);
    } else {
      this.error(`Failed to update work item: ${result.error ?? ''}`);
    }

    return result;
  }
}
