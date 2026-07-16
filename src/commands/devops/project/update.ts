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
import { updateProject, UpdateProjectResult } from '../../../utils/updateProject.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.project.update');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsProjectUpdate extends SfCommand<UpdateProjectResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'project-id': Flags.salesforceId({
      summary: messages.getMessage('flags.project-id.summary'),
      char: 'i',
      required: true,
    }),
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
    }),
    description: Flags.string({
      summary: messages.getMessage('flags.description.summary'),
      char: 'd',
    }),
    'is-active': Flags.boolean({
      summary: messages.getMessage('flags.is-active.summary'),
      allowNo: true,
    }),
  };

  public async run(): Promise<UpdateProjectResult> {
    const { flags } = await this.parse(DevopsProjectUpdate);

    if (flags['name'] === undefined && flags['description'] === undefined && flags['is-active'] === undefined) {
      this.error(messages.getMessage('error.NoFieldsProvided'));
    }

    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);

    let result: UpdateProjectResult;
    try {
      result = await updateProject({
        connection,
        projectId: flags['project-id'],
        name: flags['name'],
        description: flags['description'],
        isActive: flags['is-active'],
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      this.log(`Successfully updated project: ${flags['project-id']}`);
      if (result.name !== undefined) this.log(`  Name:        ${result.name}`);
      if (result.description !== undefined) this.log(`  Description: ${result.description}`);
      if (result.isActive !== undefined) this.log(`  IsActive:    ${result.isActive}`);
    } else {
      this.error(`Failed to update project: ${result.error ?? ''}`);
    }

    return result;
  }
}
