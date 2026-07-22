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

export type PipelineUpdateParams = {
  connection: Connection;
  pipelineId: string;
};

export type PipelineUpdateResult = {
  success: boolean;
  pipelineId: string;
  name?: string;
  status?: string;
  stageCount?: number;
  error?: string;
};

// Keep legacy alias so existing imports don't break during transition
export type ActivatePipelineParams = PipelineUpdateParams;
export type ActivatePipelineResult = PipelineUpdateResult;

type ActivateResponse = { status?: string; id: string };

/**
 * POST /services/data/v{version}/connect/devops/pipelines/{pipelineId}/activate
 */
export async function activatePipeline(params: PipelineUpdateParams): Promise<PipelineUpdateResult> {
  const { connection, pipelineId } = params;
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/activate`;
  const data = await connection.request<ActivateResponse>({
    method: 'POST',
    url: path,
    body: '{}',
    headers: { 'Content-Type': 'application/json' },
  });
  return { success: true, pipelineId, status: data.status ?? 'Active' };
}

/**
 * Record API update — covers deactivate and/or rename since no Connect API exists for those.
 */
export async function updatePipelineRecord(
  connection: Connection,
  pipelineId: string,
  fields: { IsActive?: boolean; Name?: string }
): Promise<void> {
  await connection.sobject('DevopsPipeline').update({ Id: pipelineId, ...fields });
}
