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

import { Connection } from '@salesforce/core';
import { validateSalesforceId } from './soqlUtils.js';

export type ClearedStage = {
  stageId: string;
  stageName?: string;
  branchName?: string;
};

export type DeleteStageBranchResult = {
  success: boolean;
  stageId: string;
  branchName?: string;
  clearedStages?: ClearedStage[];
  error?: string;
};

/**
 * Removes the branch associated with a pipeline stage, cascading to every upstream (left) stage.
 *
 * Branches are configured right-to-left, so a stage can only have a branch once the stage to its
 * right does. Clearing a branch therefore also clears the branch on every upstream stage to keep
 * the pipeline in a valid state. Each stage's SourceCodeRepositoryBranchId lookup is cleared; the
 * branch records themselves are left untouched.
 */
export async function deleteStageBranch(
  connection: Connection,
  targetStageId: string,
  stagesToClear: ClearedStage[]
): Promise<DeleteStageBranchResult> {
  validateSalesforceId(targetStageId, 'stage');
  stagesToClear.forEach((s) => validateSalesforceId(s.stageId, 'stage'));

  const updates = stagesToClear.map((s) => ({ Id: s.stageId, SourceCodeRepositoryBranchId: null }));
  const rawResults = await connection.sobject('DevopsPipelineStage').update(updates);
  const results = (Array.isArray(rawResults) ? rawResults : [rawResults]) as unknown as Array<{
    success: boolean;
    errors?: Array<{ message: string }>;
  }>;

  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    const errorMsg = failures.flatMap((r) => r.errors?.map((e) => e.message) ?? ['Unknown error']).join('; ');
    return { success: false, stageId: targetStageId, error: errorMsg };
  }

  const target = stagesToClear.find((s) => s.stageId === targetStageId);
  return {
    success: true,
    stageId: targetStageId,
    branchName: target?.branchName,
    clearedStages: stagesToClear,
  };
}
