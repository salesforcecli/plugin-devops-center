/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { ux } from '@oclif/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.project.list');

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
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.target-org.summary'),
      char: 'o',
      required: true,
    }),
  };

  public async run(): Promise<DevopsProjectListResult> {
    const { flags } = await this.parse(DevopsProjectList);
    const org: Org = flags['target-org'];
    const connection = org.getConnection('65.0');

    let projects: DevopsProject[];
    try {
      const query = 'SELECT Id, Name, Description FROM DevopsProject';
      const result = await connection.query<DevopsProject>(query);
      projects = result.records ?? [];
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(
          'DevOps Center is not enabled in this org. Enable DevOps Center in Setup before using this command.'
        );
      }
      throw error;
    }

    if (projects.length === 0) {
      this.log('No DevOps Center projects found in this org.');
    } else {
      ux.styledHeader('DevOps Center Projects');
      ux.table(projects, {
        Id: { header: 'Id' },
        Name: { header: 'Name' },
        Description: { header: 'Description' },
      });
    }

    return { projects };
  }
}
