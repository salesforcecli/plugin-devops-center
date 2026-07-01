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

export type AddStageBranchParams = {
  connection: Connection;
  pipelineId: string;
  stageId: string;
  branchName: string;
  createVcsBranch: boolean;
};

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
