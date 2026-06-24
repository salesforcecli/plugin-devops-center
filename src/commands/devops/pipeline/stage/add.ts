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
import { addPipelineStage, AddPipelineStageResult } from '../../../../utils/addPipelineStage.js';
import { fetchPipelineStages } from '../../../../utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.stage.add');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPipelineStageAdd extends SfCommand<AddPipelineStageResult> {
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
    'pipeline-id': Flags.salesforceId({
      summary: messages.getMessage('flags.pipeline-id.summary'),
      required: true,
      char: undefined,
    }),
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
      required: true,
    }),
    'next-stage-id': Flags.salesforceId({
      summary: messages.getMessage('flags.next-stage-id.summary'),
      required: true,
      char: undefined,
    }),
  };

  public async run(): Promise<AddPipelineStageResult> {
    const { flags } = await this.parse(DevopsPipelineStageAdd);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];
    const nextStageId = flags['next-stage-id'];

    let stages: PipelineStageRecord[];
    try {
      stages = await fetchPipelineStages(connection, pipelineId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (!stages.some((s) => s.Id === nextStageId)) {
      this.error(messages.getMessage('error.StageNotFound', [nextStageId, pipelineId]));
    }

    let result: AddPipelineStageResult;
    try {
      result = await addPipelineStage({
        connection,
        pipelineId,
        name: flags['name'],
        nextStageId,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      this.log(`Successfully added stage "${result.name ?? ''}" to the pipeline.`);
      this.log(`  Stage ID:    ${result.stageId ?? ''}`);
      this.log(`  Position:    before "${nextStageId}"`);
      this.log(`  Pipeline ID: ${pipelineId}`);
    } else {
      this.error(`Failed to add stage: ${result.error ?? ''}`);
    }

    return result;
  }
}
