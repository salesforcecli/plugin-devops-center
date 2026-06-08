/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { createWorkItem, CreateWorkItemResult } from '../../../utils/createWorkItem';

Messages.importMessagesDirectory(__dirname);
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
