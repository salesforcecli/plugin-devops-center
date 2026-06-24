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

export type ActivatePipelineParams = {
  connection: Connection;
  pipelineId: string;
};

export type ActivatePipelineResult = {
  success: boolean;
  pipelineId: string;
  status?: string;
  stageCount?: number;
  error?: string;
};

/**
 * Activates a DevOps Center pipeline via the Connect API.
 * POST /services/data/v{version}/connect/devops/pipelines/{pipelineId}/activate
 */
export async function activatePipeline(params: ActivatePipelineParams): Promise<ActivatePipelineResult> {
  const { connection, pipelineId } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/activate`;

  await connection.request({
    method: 'POST',
    url: path,
    body: '{}',
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    success: true,
    pipelineId,
    status: 'Active',
  };
}
