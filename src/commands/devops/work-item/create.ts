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
import { createWorkItem, CreateWorkItemResult } from '../../../utils/createWorkItem.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.create');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsWorkItemCreate extends SfCommand<CreateWorkItemResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'project-id': Flags.salesforceId({
      summary: messages.getMessage('flags.project-id.summary'),
      char: 'p',
      required: true,
      startsWith: '1Qg',
    }),
    subject: Flags.string({
      summary: messages.getMessage('flags.subject.summary'),
      char: 's',
      required: true,
    }),
    description: Flags.string({
      summary: messages.getMessage('flags.description.summary'),
      char: 'd',
    }),
  };

  public async run(): Promise<CreateWorkItemResult> {
    const { flags } = await this.parse(DevopsWorkItemCreate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);

    let result: CreateWorkItemResult;
    try {
      result = await createWorkItem({
        connection,
        projectId: flags['project-id'],
        subject: flags['subject'],
        description: flags['description'] ?? '',
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      this.log(`Successfully created work item: ${result.workItemName ?? result.workItemId ?? ''}`);
      this.log(`  ID: ${result.workItemId ?? ''}`);
      this.log(`  Subject: ${result.subject ?? ''}`);
    } else {
      this.error(`Failed to create work item: ${result.error ?? ''}`);
    }

    return result;
  }
}
