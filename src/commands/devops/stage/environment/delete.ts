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
import { deleteStageEnvironment, DeleteStageEnvironmentResult } from '../../../../utils/deleteStageEnvironment.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.stage.environment.delete');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsStageEnvironmentDelete extends SfCommand<DeleteStageEnvironmentResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'pipeline-id': Flags.salesforceId({
      summary: messages.getMessage('flags.pipeline-id.summary'),
      required: true,
      char: undefined,
    }),
    'environment-id': Flags.salesforceId({
      summary: messages.getMessage('flags.environment-id.summary'),
      required: true,
      char: 'e',
    }),
  };

  public async run(): Promise<DeleteStageEnvironmentResult> {
    const { flags } = await this.parse(DevopsStageEnvironmentDelete);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];
    const environmentId = flags['environment-id'];

    // pipeline-id and environment-id are already validated by Flags.salesforceId()
    const pipelineQueryResult = await connection.query(
      `SELECT IsActive FROM DevopsPipeline WHERE Id = '${pipelineId}' LIMIT 1`
    );
    const pipelineRecord = (pipelineQueryResult.records ?? [])[0] as { IsActive?: boolean } | undefined;
    if (pipelineRecord?.IsActive) {
      this.error(messages.getMessage('error.PipelineAlreadyActive', [pipelineId]));
    }

    let result: DeleteStageEnvironmentResult;
    try {
      result = await deleteStageEnvironment(connection, environmentId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      if (errMsg.includes('entity is deleted')) {
        this.error(messages.getMessage('error.EnvironmentNotFound', [environmentId]));
      }
      throw error;
    }

    if (result.success) {
      this.log(`Successfully deleted environment ${environmentId}.`);
    } else {
      this.error(`Failed to delete environment: ${result.error ?? ''}`);
    }

    return result;
  }
}
