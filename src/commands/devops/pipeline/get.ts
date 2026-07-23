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
import { getPipeline, PipelineGetResult } from '../../../utils/getPipeline.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.get');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPipelineGet extends SfCommand<PipelineGetResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'pipeline-id': Flags.salesforceId({
      summary: messages.getMessage('flags.pipeline-id.summary'),
      char: 'i',
      required: true,
    }),
  };

  public async run(): Promise<PipelineGetResult> {
    const { flags } = await this.parse(DevopsPipelineGet);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);

    let result: PipelineGetResult;
    try {
      result = await getPipeline(connection, flags['pipeline-id']);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    this.styledHeader(`Pipeline: ${result.name}`);
    this.log(`  ID:          ${result.id}`);
    this.log(`  Description: ${result.description ?? ''}`);
    this.log(`  Active:      ${result.isActive}`);

    if (result.stages.length > 0) {
      this.log('');
      this.styledHeader('Stages');
      this.table({
        data: result.stages.map((s) => ({
          ID: s.id,
          Name: s.name ?? '',
          'Next Stage ID': s.nextStageId ?? '',
          Branch: s.branchName ?? '',
          Repository:
            s.repositoryOwner && s.repositoryName ? `${s.repositoryOwner}/${s.repositoryName}` : s.repositoryName ?? '',
          Environment: s.environment?.name ?? '',
          'Environment ID': s.environment?.id ?? '',
        })),
        columns: ['ID', 'Name', 'Next Stage ID', 'Branch', 'Repository', 'Environment', 'Environment ID'],
      });
    }

    if (result.connectedProjects.length > 0) {
      this.log('');
      this.styledHeader('Connected Projects');
      this.table({
        data: result.connectedProjects.map((p) => ({ ID: p.id, Name: p.name ?? '' })),
        columns: ['ID', 'Name'],
      });
    }

    return result;
  }
}
