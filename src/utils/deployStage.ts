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

export type UndeployedWorkItemsResult = {
  undeployedWorkitemIds: string[];
};

export type ValidateDeployResult = {
  success: boolean;
  errorType: string | null;
  errorDetails: string | null;
};

export type DeployStageResult = {
  requestId: string;
  status: string;
  message: string;
  promotedWorkitemIds: string[];
};

type UndeployedWorkItemsResponse = {
  undeployedWorkitemIds?: string[];
};

type ValidateDeployResponse = {
  success?: boolean;
  errorType?: string;
  errorDetails?: string;
};

type DeployStageResponse = {
  requestId?: string;
  status?: string;
  message?: string;
  promotedWorkitemIds?: string[];
};

/**
 * GET /services/data/vXX.X/connect/devops/pipelines/{pipelineId}/stages/{stageId}/undeployedWorkitems
 */
export async function getUndeployedWorkItems(
  connection: Connection,
  pipelineId: string,
  stageId: string
): Promise<UndeployedWorkItemsResult> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/stages/${stageId}/undeployedWorkitems`;
  const response = await connection.request<UndeployedWorkItemsResponse>({ method: 'GET', url: path });
  return { undeployedWorkitemIds: response.undeployedWorkitemIds ?? [] };
}

/**
 * POST /services/data/vXX.X/connect/devops/pipelines/{pipelineId}/validatePromote
 */
export async function validateDeploy(
  connection: Connection,
  pipelineId: string,
  workItemIds: string[],
  targetStageId: string
): Promise<ValidateDeployResult> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/validatePromote`;
  const response = await connection.request<ValidateDeployResponse>({
    method: 'POST',
    url: path,
    body: JSON.stringify({ selectedWorkItemIds: workItemIds, targetStageId }),
    headers: { 'Content-Type': 'application/json' },
  });
  return {
    success: response.success ?? true,
    errorType: response.errorType ?? null,
    errorDetails: response.errorDetails ?? null,
  };
}

/**
 * POST /services/data/vXX.X/connect/devops/pipelines/{pipelineId}/promote
 * Uses workitemIds: [] so Core fills IDs from undeployed/external-merge state.
 */
export async function executeDeploy(
  connection: Connection,
  pipelineId: string,
  targetStageId: string,
  fullDeploy = false,
  testLevel = 'Default',
  runTests: string[] = []
): Promise<DeployStageResult> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/promote`;
  const response = await connection.request<DeployStageResponse>({
    method: 'POST',
    url: path,
    body: JSON.stringify({
      workitemIds: [],
      targetStageId,
      allWorkItemsInStage: true,
      isCheckDeploy: false,
      deployOptions: { testLevel, isFullDeploy: fullDeploy, runTests },
    }),
    headers: { 'Content-Type': 'application/json' },
  });
  return {
    requestId: response.requestId ?? '',
    status: response.status ?? '',
    message: response.message ?? '',
    promotedWorkitemIds: response.promotedWorkitemIds ?? [],
  };
}
