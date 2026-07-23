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

export type PrepareWorkItemParams = {
  connection: Connection;
  pipelineId: string;
  workItemId: string;
  sourceStageId: string;
  targetStageId: string;
};

export type PrepareWorkItemResult = {
  success: boolean;
  requestToken: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type PrepareOneOffPromotionResponse = {
  success?: boolean;
  requestToken?: string;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Prepares a work item for one-off promotion by creating the necessary branches
 * and pull requests in the source control repository.
 * API: POST /services/data/v{version}/connect/devops/pipelines/{pipelineId}/promote/oneoff/prepare
 */
export async function prepareWorkItem(params: PrepareWorkItemParams): Promise<PrepareWorkItemResult> {
  const { connection, pipelineId, workItemId, sourceStageId, targetStageId } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/promote/oneoff/prepare`;
  const body = JSON.stringify({
    selectedWorkItemId: workItemId,
    sourceStageId,
    targetStageId,
  });

  const data = await connection.request<PrepareOneOffPromotionResponse>({
    method: 'POST',
    url: path,
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    success: data.success ?? true,
    requestToken: data.requestToken ?? null,
    errorCode: data.errorCode ?? null,
    errorMessage: data.errorMessage ?? null,
  };
}

export type WorkItemContext = {
  projectId: string;
  pipelineStageId: string;
};

export async function resolveProjectIdFromWorkItem(
  connection: Connection,
  workItemId: string
): Promise<WorkItemContext> {
  validateSalesforceId(workItemId, 'work item');
  const result = await connection.query<{ DevopsProjectId: string; DevopsPipelineStageId: string }>(
    `SELECT DevopsProjectId, DevopsPipelineStageId FROM WorkItem WHERE Id = '${workItemId}' LIMIT 1`
  );
  const records = result.records ?? [];
  if (records.length === 0) {
    throw new Error(`Work item '${workItemId}' not found. Verify the work item ID and try again.`);
  }
  return {
    projectId: records[0].DevopsProjectId,
    pipelineStageId: records[0].DevopsPipelineStageId ?? '',
  };
}
