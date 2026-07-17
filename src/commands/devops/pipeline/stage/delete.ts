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
import { deletePipelineStage, DeletePipelineStageResult } from '../../../../utils/deletePipelineStage.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.stage.delete');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPipelineStageDelete extends SfCommand<DeletePipelineStageResult> {
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
    'stage-id': Flags.salesforceId({
      summary: messages.getMessage('flags.stage-id.summary'),
      required: true,
      char: undefined,
    }),
  };

  public async run(): Promise<DeletePipelineStageResult> {
    const { flags } = await this.parse(DevopsPipelineStageDelete);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];
    const stageId = flags['stage-id'];

    let result: DeletePipelineStageResult;
    try {
      result = await deletePipelineStage(connection, pipelineId, stageId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      if (errMsg.startsWith('Stage not found:') || errMsg.includes('entity is deleted')) {
        this.error(messages.getMessage('error.StageNotFound', [stageId, pipelineId]));
      }
      throw error;
    }

    if (result.success) {
      this.log(`Successfully deleted stage ${stageId} from pipeline ${pipelineId}.`);
    } else {
      this.error(`Failed to delete stage: ${result.error ?? ''}`);
    }

    return result;
  }
}
