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
import { activatePipeline, ActivatePipelineResult } from '../../../utils/activatePipeline.js';
import { fetchPipelineStages } from '../../../utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.activate');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPipelineActivate extends SfCommand<ActivatePipelineResult> {
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
  };

  public async run(): Promise<ActivatePipelineResult> {
    const { flags } = await this.parse(DevopsPipelineActivate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];

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

    if (stages.length === 0) {
      this.error(messages.getMessage('error.NoStages', [pipelineId]));
    }

    let result: ActivatePipelineResult;
    try {
      result = await activatePipeline({ connection, pipelineId });
      result.stageCount = stages.length;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      if (errMsg.includes('already active') || errMsg.includes('ALREADY_ACTIVE')) {
        this.error(messages.getMessage('error.AlreadyActive', [pipelineId]));
      }
      throw error;
    }

    if (result.success) {
      this.log('Successfully activated the pipeline.');
      this.log(`  Pipeline ID: ${pipelineId}`);
      this.log(`  Status:      ${result.status ?? 'Active'}`);
      this.log(`  Stages:      ${result.stageCount ?? stages.length}`);
    } else {
      this.error(`Failed to activate pipeline: ${result.error ?? ''}`);
    }

    return result;
  }
}
