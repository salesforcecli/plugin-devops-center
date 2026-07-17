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
import { fetchPipelineStages } from './pipelineUtils.js';

export type DeletePipelineStageResult = {
  success: boolean;
  stageId?: string;
  pipelineId?: string;
  error?: string;
};

/**
 * Deletes a pipeline stage and re-links any predecessor stage so the chain stays intact.
 * If stage B sits between A→B→C, deleting B updates A's NextStageId to C before the delete.
 */
export async function deletePipelineStage(
  connection: Connection,
  pipelineId: string,
  stageId: string
): Promise<DeletePipelineStageResult> {
  const stages = await fetchPipelineStages(connection, pipelineId);
  const target = stages.find((s) => s.Id === stageId);
  if (!target) {
    throw new Error(`Stage not found: ${stageId}`);
  }

  const predecessor = stages.find((s) => s.NextStageId === stageId);
  if (predecessor) {
    await connection
      .sobject('DevopsPipelineStage')
      .update({ Id: predecessor.Id, NextStageId: target.NextStageId ?? null });
  }

  const result = await connection.sobject('DevopsPipelineStage').delete(stageId);
  const deleteResult = result as unknown as { success: boolean; errors?: Array<{ message: string }> };

  if (!deleteResult.success) {
    const errorMsg = deleteResult.errors?.map((e) => e.message).join('; ') ?? 'Unknown error';
    return { success: false, error: errorMsg };
  }

  return { success: true, stageId, pipelineId };
}
