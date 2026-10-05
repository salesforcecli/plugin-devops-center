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

import { Connection, Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import {
  addStageBranch,
  AddStageBranchResult,
  ExistingStageBranch,
  getStageBranch,
  deleteOrphanedBranch,
} from '../../../../utils/addStageBranch.js';
import { fetchPipelineStages } from '../../../../utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.stage.branch.add');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

// The platform stores created branch names with a "$$" marker prefix; strip it for display.
function displayBranchName(existingBranch: ExistingStageBranch): string {
  return (existingBranch.branchName ?? existingBranch.branchId).replace(/^\$\$/, '');
}

export default class DevopsStageBranchAdd extends SfCommand<AddStageBranchResult> {
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
    'branch-name': Flags.string({
      summary: messages.getMessage('flags.branch-name.summary'),
      required: true,
      char: 'b',
    }),
    'create-vcs-branch': Flags.boolean({
      summary: messages.getMessage('flags.create-vcs-branch.summary'),
      default: false,
    }),
    force: Flags.boolean({
      summary: messages.getMessage('flags.force.summary'),
      default: false,
    }),
  };

  public async run(): Promise<AddStageBranchResult> {
    const { flags } = await this.parse(DevopsStageBranchAdd);
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

    const existingBranch = await this.guardExistingBranch(connection, stageId, flags.force);

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

    if (existingBranch && result.success) {
      await this.cleanupReplacedBranch(connection, existingBranch);
    }

    return this.logResult(result, stageId, pipelineId);
  }

  /**
   * A stage holds only one branch (DevopsPipelineStage.SourceCodeRepositoryBranchId). Adding a new
   * one re-points the lookup and orphans the old SourceCodeRepositoryBranch record, so block by
   * default and require --force to replace it. Returns the existing branch (when present) so the
   * caller can remove the orphaned record after the new branch is associated.
   */
  private async guardExistingBranch(
    connection: Connection,
    stageId: string,
    force: boolean
  ): Promise<ExistingStageBranch | undefined> {
    const existingBranch = await getStageBranch(connection, stageId);
    if (!existingBranch) {
      return undefined;
    }
    if (!force) {
      this.error(
        messages.getMessage('error.BranchAlreadyExists', [stageId, displayBranchName(existingBranch), this.config.bin])
      );
    }
    return existingBranch;
  }

  /**
   * Removes the branch record the stage was re-pointed away from, unless another stage still
   * references it. Best-effort: a cleanup failure is surfaced as a warning and does not fail the
   * command, since the new branch has already been associated successfully.
   */
  private async cleanupReplacedBranch(connection: Connection, existingBranch: ExistingStageBranch): Promise<void> {
    try {
      const deleted = await deleteOrphanedBranch(connection, existingBranch.branchId);
      if (deleted) {
        this.log(messages.getMessage('info.ReplacedBranchRemoved', [displayBranchName(existingBranch)]));
      }
    } catch {
      this.warn(messages.getMessage('warn.ReplacedBranchCleanupFailed', [existingBranch.branchId]));
    }
  }

  private logResult(result: AddStageBranchResult, stageId: string, pipelineId: string): AddStageBranchResult {
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
