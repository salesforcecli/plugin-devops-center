/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { ux } from '@oclif/core';
import { fetchWorkItems } from '../../../utils/workItems';
import { WorkItem } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.list');

export type DevopsWorkItemListResult = {
  workItems: WorkItem[];
};

export default class DevopsWorkItemList extends SfCommand<DevopsWorkItemListResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.target-org.summary'),
      char: 'o',
      required: true,
    }),
    'project-id': Flags.string({
      summary: messages.getMessage('flags.project-id.summary'),
      char: 'p',
      required: true,
    }),
  };

  public async run(): Promise<DevopsWorkItemListResult> {
    const { flags } = await this.parse(DevopsWorkItemList);
    const org: Org = flags['target-org'];
    const projectId: string = flags['project-id'];
    const connection = org.getConnection('65.0');

    let workItems: WorkItem[];
    try {
      workItems = await fetchWorkItems(connection, projectId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(
          'DevOps Center is not enabled in this org. Enable DevOps Center in Setup before using this command.'
        );
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

      ux.styledHeader('DevOps Center Work Items');
      ux.table(tableData, {
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
