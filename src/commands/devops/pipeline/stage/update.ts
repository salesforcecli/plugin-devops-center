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
import { validateSalesforceId } from '../../../../utils/soqlUtils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.stage.update');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type PipelineStageUpdateResult = {
  success: boolean;
  stageId: string;
  name: string;
};

export default class DevopsPipelineStageUpdate extends SfCommand<PipelineStageUpdateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'stage-id': Flags.salesforceId({
      summary: messages.getMessage('flags.stage-id.summary'),
      required: true,
      char: 's',
    }),
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      required: true,
      char: 'n',
    }),
  };

  public async run(): Promise<PipelineStageUpdateResult> {
    const { flags } = await this.parse(DevopsPipelineStageUpdate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const stageId = flags['stage-id'];
    const name = flags['name'];

    validateSalesforceId(stageId, 'stage');

    try {
      await connection.sobject('DevopsPipelineStage').update({ Id: stageId, Name: name });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      if (errMsg.toLowerCase().includes('not found') || errMsg.includes('entity is deleted')) {
        this.error(messages.getMessage('error.StageNotFound', [stageId]));
      }
      throw error;
    }

    this.log(`Successfully updated stage "${name}".`);
    this.log(`  Stage ID: ${stageId}`);
    this.log(`  Name:     ${name}`);

    return { success: true, stageId, name };
  }
}
