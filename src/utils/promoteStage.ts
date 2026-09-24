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

export type PromoteStageParams = {
  connection: Connection;
  pipelineId: string;
  workItemIds: string[];
  targetStageId: string;
  fullDeploy?: boolean;
  testLevel?: string;
  runTests?: string[];
};

export type PromoteStageResult = {
  requestId: string;
  status: string;
  message: string;
  promotedWorkitemIds: string[];
};

type PromoteStageResponse = {
  requestId?: string;
  status?: string;
  message?: string;
  promotedWorkitemIds?: string[];
};

/**
 * Promotes work items to a target pipeline stage via the Connect API.
 * POST /services/data/v{version}/connect/devops/pipelines/{pipelineId}/promote
 */
export async function promoteStage(params: PromoteStageParams): Promise<PromoteStageResult> {
  const {
    connection,
    pipelineId,
    workItemIds,
    targetStageId,
    fullDeploy = false,
    testLevel = 'Default',
    runTests,
  } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/promote`;

  const response = await connection.request<PromoteStageResponse>({
    method: 'POST',
    url: path,
    body: JSON.stringify({
      workitemIds: workItemIds,
      targetStageId,
      allWorkItemsInStage: false,
      isCheckDeploy: false,
      deployOptions: {
        testLevel,
        isFullDeploy: fullDeploy,
        runTests: runTests ?? [],
      },
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

/**
 * DevopsPipelnStgProm.Status values that indicate a promotion has been submitted
 * but has not yet finished (i.e. is still in flight).
 */
export const IN_FLIGHT_PROMOTION_STATUSES = ['NEW', 'IN_PROGRESS', 'FINALIZING'] as const;

export type InFlightPromotion = {
  id: string;
  requestToken: string;
  status: string;
};

type PipelineStagePromotionRecord = {
  Id: string;
  Status: string;
  RequestInfoId: string | null;
  RequestInfo: { RequestToken: string | null } | null;
};

/**
 * Returns any in-flight promotions targeting the given pipeline stage.
 *
 * DevopsPipelnStgProm (Pipeline Stage Promotion) records the target stage of a promotion
 * (PipelineStageId) and links to its DevopsRequestInfo, so the check is scoped to the
 * specific target stage — and therefore its pipeline — rather than the whole org. Used to
 * block a duplicate promotion to the same stage while one is already running, without
 * affecting promotions in other stages or pipelines.
 */
export async function findInFlightPromotions(
  connection: Connection,
  targetStageId: string
): Promise<InFlightPromotion[]> {
  validateSalesforceId(targetStageId, 'target stage');
  const statusList = IN_FLIGHT_PROMOTION_STATUSES.join("', '");
  const result = await connection.query<PipelineStagePromotionRecord>(
    `SELECT Id, Status, RequestInfoId, RequestInfo.RequestToken FROM DevopsPipelnStgProm WHERE PipelineStageId = '${targetStageId}' AND Status IN ('${statusList}') LIMIT 10`
  );
  return (result.records ?? []).map((r) => ({
    id: r.Id,
    requestToken: r.RequestInfo?.RequestToken ?? r.RequestInfoId ?? '',
    status: r.Status,
  }));
}
