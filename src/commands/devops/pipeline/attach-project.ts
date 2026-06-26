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
import { attachProject, AttachProjectResult, findExistingAttachment } from '../../../utils/attachProject.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.attach-project');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPipelineAttachProject extends SfCommand<AttachProjectResult> {
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
    'project-id': Flags.salesforceId({
      summary: messages.getMessage('flags.project-id.summary'),
      required: true,
      char: undefined,
    }),
  };

  public async run(): Promise<AttachProjectResult> {
    const { flags } = await this.parse(DevopsPipelineAttachProject);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const projectId = flags['project-id'];
    const pipelineId = flags['pipeline-id'];

    let existingPipelineId: string | undefined;
    try {
      existingPipelineId = await findExistingAttachment(connection, projectId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (existingPipelineId) {
      this.error(messages.getMessage('error.AlreadyAttached', [projectId, existingPipelineId]));
    }

    let result: AttachProjectResult;
    try {
      result = await attachProject({ connection, projectId, pipelineId });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      this.log('Successfully attached project to pipeline.');
      this.log(`  Project ID:  ${projectId}`);
      this.log(`  Pipeline ID: ${pipelineId}`);
    } else {
      this.error(`Failed to attach project to pipeline: ${result.error ?? ''}`);
    }

    return result;
  }
}
