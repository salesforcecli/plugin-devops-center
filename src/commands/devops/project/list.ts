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

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.project.list');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type DevopsProject = {
  Id: string;
  Name: string;
  Description: string | null;
};

export type DevopsProjectListResult = {
  projects: DevopsProject[];
};

export default class DevopsProjectList extends SfCommand<DevopsProjectListResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
  };

  public async run(): Promise<DevopsProjectListResult> {
    const { flags } = await this.parse(DevopsProjectList);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);

    let projects: DevopsProject[];
    try {
      const query = 'SELECT Id, Name, Description FROM DevopsProject';
      const result = await connection.query<DevopsProject>(query);
      projects = result.records ?? [];
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (projects.length === 0) {
      this.log('No DevOps Center projects found in this org.');
    } else {
      this.styledHeader('DevOps Center Projects');
      this.table({
        data: projects,
        columns: ['Id', 'Name', 'Description'],
      });
    }

    return { projects };
  }
}
