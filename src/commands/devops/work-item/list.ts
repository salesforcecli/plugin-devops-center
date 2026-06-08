/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { fetchWorkItems } from '../../../utils/workItems';
import { WorkItem } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
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
      this.table(tableData, {
        Name: { header: 'Name' },
        Subject: { header: 'Subject' },
        Status: { header: 'Status' },
        Branch: { header: 'Branch' },
        'Target Branch': { header: 'Target Branch' },
      });
    }

    return { workItems };
  }
}
