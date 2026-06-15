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
import { fetchWorkItems } from '../../../utils/workItems.js';
import { WorkItem } from '../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.list');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type DevopsWorkItemListResult = {
  workItems: WorkItem[];
};

export default class DevopsWorkItemList extends SfCommand<DevopsWorkItemListResult> {
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
  };

  public async run(): Promise<DevopsWorkItemListResult> {
    const { flags } = await this.parse(DevopsWorkItemList);
    const org: Org = flags['target-org'];
    const projectId: string = flags['project-id'];
    const connection = org.getConnection(flags['api-version']);

    let workItems: WorkItem[];
    try {
      workItems = await fetchWorkItems(connection, projectId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (workItems.length === 0) {
      this.log('No work items found for this project.');
    } else {
      const tableData = workItems.map((wi) => ({
        Name: wi.name,
        Subject: wi.subject ?? '',
        Status: wi.status,
        Branch: wi.WorkItemBranch ?? '',
        'Target Branch': wi.TargetBranch ?? '',
      }));

      this.styledHeader('DevOps Center Work Items');
      this.table({
        data: tableData,
        columns: ['Name', 'Subject', 'Status', 'Branch', 'Target Branch'],
      });
    }

    return { workItems };
  }
}
