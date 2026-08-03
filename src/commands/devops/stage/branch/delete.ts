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
import { ClearedStage, deleteStageBranch, DeleteStageBranchResult } from '../../../../utils/deleteStageBranch.js';
import { computeUpstreamStageIds, fetchPipelineStages } from '../../../../utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.stage.branch.delete');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsStageBranchDelete extends SfCommand<DeleteStageBranchResult> {
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

  public async run(): Promise<DeleteStageBranchResult> {
    const { flags } = await this.parse(DevopsStageBranchDelete);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];
    const stageId = flags['stage-id'];

    // The branch can only be removed while the pipeline is inactive.
    const pipelineQueryResult = await connection.query(
      `SELECT IsActive FROM DevopsPipeline WHERE Id = '${pipelineId}' LIMIT 1`
    );
    const pipelineRecord = (pipelineQueryResult.records ?? [])[0] as { IsActive?: boolean } | undefined;
    if (pipelineRecord?.IsActive) {
      this.error(messages.getMessage('error.PipelineAlreadyActive', [pipelineId]));
    }

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

    const branchName = targetStage.SourceCodeRepositoryBranch?.Name;
    if (!branchName) {
      this.error(messages.getMessage('error.NoBranch', [targetStage.Name ?? stageId]));
    }

    // Branches are configured right-to-left, so removing this stage's branch must also remove the
    // branch from every upstream (left) stage to keep the pipeline in a valid state.
    const upstreamStageIds = computeUpstreamStageIds(stages, stageId);
    const stagesById = new Map(stages.map((s) => [s.Id, s]));
    const stagesToClear: ClearedStage[] = [targetStage, ...upstreamStageIds.map((id) => stagesById.get(id))]
      .filter((s): s is PipelineStageRecord => Boolean(s?.SourceCodeRepositoryBranch?.Name))
      .map((s) => ({ stageId: s.Id, stageName: s.Name, branchName: s.SourceCodeRepositoryBranch?.Name }));

    let result: DeleteStageBranchResult;
    try {
      result = await deleteStageBranch(connection, stageId, stagesToClear);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (result.success) {
      this.log(`Successfully deleted branch "${result.branchName ?? ''}" from the stage.`);
      this.log(`  Stage ID:    ${stageId}`);
      this.log(`  Pipeline ID: ${pipelineId}`);
      const cascaded = (result.clearedStages ?? []).filter((s) => s.stageId !== stageId);
      if (cascaded.length > 0) {
        this.log('');
        this.log('Also removed branches from upstream stages:');
        cascaded.forEach((s) => this.log(`  - ${s.stageName ?? s.stageId}: "${s.branchName ?? ''}"`));
      }
    } else {
      this.error(messages.getMessage('error.BranchDeleteFailed', [result.error ?? '']));
    }

    return result;
  }
}
