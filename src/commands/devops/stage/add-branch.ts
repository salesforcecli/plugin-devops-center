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
import { addStageBranch, AddStageBranchResult } from '../../../utils/addStageBranch.js';
import { fetchPipelineStages } from '../../../utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.stage.add-branch');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsStageAddBranch extends SfCommand<AddStageBranchResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'pipeline-id': Flags.salesforceId({
      summary: messages.getMessage('flags.pipeline-id.summary'),
      required: true,
    }),
    'stage-id': Flags.salesforceId({
      summary: messages.getMessage('flags.stage-id.summary'),
      required: true,
    }),
    'branch-name': Flags.string({
      summary: messages.getMessage('flags.branch-name.summary'),
      required: true,
      char: 'b',
    }),
    'create-vcs-branch': Flags.boolean({
      summary: messages.getMessage('flags.create-vcs-branch.summary'),
      default: false,
    }),
  };

  public async run(): Promise<AddStageBranchResult> {
    const { flags } = await this.parse(DevopsStageAddBranch);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];
    const stageId = flags['stage-id'];

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

    const targetStage = stages.find((s) => s.Id === stageId);
    if (!targetStage) {
      this.error(messages.getMessage('error.StageNotFound', [stageId, pipelineId]));
    }

    // Enforce right-to-left branch setup order: the next stage (to the right)
    // must already have a branch before this stage can be configured.
    if (targetStage.NextStageId) {
      const nextStage = stages.find((s) => s.Id === targetStage.NextStageId);
      if (nextStage && !nextStage.SourceCodeRepositoryBranch?.Name) {
        this.error(messages.getMessage('error.NextStageNoBranch', [nextStage.Name ?? nextStage.Id, stageId]));
      }
    }

    let result: AddStageBranchResult;
    try {
      result = await addStageBranch({
        connection,
        pipelineId,
        stageId,
        branchName: flags['branch-name'],
        createVcsBranch: flags['create-vcs-branch'],
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      const action = result.branchCreated ? 'Created branch and associated it' : 'Successfully associated branch';
      this.log(`${action} with the stage.`);
      this.log(`  Stage ID:       ${stageId}`);
      this.log(`  Branch:         ${result.branchName ?? ''}${result.branchCreated ? ' (newly created)' : ''}`);
      this.log(`  Repo Branch ID: ${result.repoBranchId ?? ''}`);
      this.log(`  Pipeline ID:    ${pipelineId}`);
    } else {
      this.error(messages.getMessage('error.BranchAttachFailed', [result.error ?? '']));
    }

    return result;
  }
}
