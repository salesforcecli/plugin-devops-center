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

export type PromoteStageParams = {
  connection: Connection;
  pipelineId: string;
  workItemIds: string[];
  targetStageId: string;
};

export type PromoteStageResult = {
  jobId: string;
  status: string;
  message: string;
  errorDetails: string;
};

type ConnectPromoteResponse = {
  jobId?: string;
  status?: string;
  message?: string;
  errorDetails?: string;
};

/**
 * Promotes work items to a target stage via the Connect API.
 * POST /services/data/v{version}/connect/devops/pipelines/{pipelineId}/promote
 */
export async function promoteStage(params: PromoteStageParams): Promise<PromoteStageResult> {
  const { connection, pipelineId, workItemIds, targetStageId } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/promote`;

  const data = await connection.request<ConnectPromoteResponse>({
    method: 'POST',
    url: path,
    body: JSON.stringify({ workitemIds: workItemIds, targetStageId }),
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    jobId: data.jobId ?? '',
    status: data.status ?? '',
    message: data.message ?? '',
    errorDetails: data.errorDetails ?? '',
  };
}
