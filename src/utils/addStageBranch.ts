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

export type AddStageBranchParams = {
  connection: Connection;
  pipelineId: string;
  stageId: string;
  branchName: string;
  createVcsBranch: boolean;
};

export type ExistingStageBranch = {
  branchId: string;
  branchName?: string;
};

/**
 * Returns the branch currently associated with a pipeline stage, if any.
 *
 * A stage references its branch via DevopsPipelineStage.SourceCodeRepositoryBranchId. Adding a new
 * branch re-points that lookup, so callers must check for an existing branch first to avoid
 * orphaning the old SourceCodeRepositoryBranch record.
 */
export async function getStageBranch(
  connection: Connection,
  stageId: string
): Promise<ExistingStageBranch | undefined> {
  validateSalesforceId(stageId, 'stage');
  const result = await connection.query<{
    SourceCodeRepositoryBranchId: string | null;
    SourceCodeRepositoryBranch: { Name: string } | null;
  }>(
    `SELECT SourceCodeRepositoryBranchId, SourceCodeRepositoryBranch.Name FROM DevopsPipelineStage WHERE Id = '${stageId}' LIMIT 1`
  );
  const record = (result.records ?? [])[0];
  if (!record?.SourceCodeRepositoryBranchId) {
    return undefined;
  }
  return { branchId: record.SourceCodeRepositoryBranchId, branchName: record.SourceCodeRepositoryBranch?.Name };
}

/**
 * Deletes a SourceCodeRepositoryBranch record only when no pipeline stage still references it.
 * Returns true when the record was deleted, false when it is still referenced (left intact).
 *
 * Used to clean up the branch a stage was re-pointed away from during a --force replace, so the old
 * record isn't orphaned in the org. The reference check keeps a branch shared by another stage safe.
 */
export async function deleteOrphanedBranch(connection: Connection, branchId: string): Promise<boolean> {
  validateSalesforceId(branchId, 'branch');
  const refs = await connection.query<{ Id: string }>(
    `SELECT Id FROM DevopsPipelineStage WHERE SourceCodeRepositoryBranchId = '${branchId}' LIMIT 1`
  );
  if ((refs.records ?? []).length > 0) {
    return false;
  }
  await connection.sobject('SourceCodeRepositoryBranch').delete(branchId);
  return true;
}

export type AddStageBranchResult = {
  success: boolean;
  stageId: string;
  branchName?: string;
  branchCreated?: boolean;
  repoBranchId?: string;
  pipelineId?: string;
  error?: string;
};

type PipelineStagePatchResponse = {
  id: string;
  status: string;
  message?: string;
  repoBranchId?: string;
};

/**
 * Associates a branch with a pipeline stage via the Connect API.
 * PATCH /services/data/v{version}/connect/devops/pipelines/{pipelineId}/stages/{stageId}
 */
export async function addStageBranch(params: AddStageBranchParams): Promise<AddStageBranchResult> {
  const { connection, pipelineId, stageId, branchName, createVcsBranch } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/stages/${stageId}`;

  const data = await connection.request<PipelineStagePatchResponse>({
    method: 'PATCH',
    url: path,
    body: JSON.stringify({
      vcsBranch: branchName,
      createVcsBranch: String(createVcsBranch),
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (data.status === 'FAILED') {
    return {
      success: false,
      stageId,
      error: data.message ?? 'Failed to associate branch with stage',
    };
  }

  return {
    success: true,
    stageId,
    branchName,
    branchCreated: createVcsBranch,
    repoBranchId: data.repoBranchId,
    pipelineId,
  };
}
