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
import { createProject, CreateProjectResult } from '../../../utils/createProject.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.project.create');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsProjectCreate extends SfCommand<CreateProjectResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      char: 'o',
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
    'api-version': Flags.orgApiVersion(),
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
      required: true,
    }),
    description: Flags.string({
      summary: messages.getMessage('flags.description.summary'),
      char: 'd',
    }),
  };

  public async run(): Promise<CreateProjectResult> {
    const { flags } = await this.parse(DevopsProjectCreate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);

    let result: CreateProjectResult;
    try {
      result = await createProject({
        connection,
        name: flags['name'],
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
      this.log(`Successfully created project: ${result.name ?? ''}`);
      this.log(`  ID:          ${result.projectId ?? ''}`);
      this.log(`  Name:        ${result.name ?? ''}`);
      if (result.description) {
        this.log(`  Description: ${result.description}`);
      }
    } else {
      this.error(`Failed to create project: ${result.error ?? ''}`);
    }

    return result;
  }
}
