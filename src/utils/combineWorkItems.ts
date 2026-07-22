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

export type CombineWorkItemsPrepareParams = {
  connection: Connection;
  pipelineId: string;
  parentWorkItemId: string;
  childWorkItemIds: string[];
  sourceStageId: string;
  targetStageId: string;
};

export type CombineWorkItemsPrepareResult = {
  success: boolean;
  requestToken: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type CombineWorkItemsPrepareResponse = {
  success?: boolean;
  requestToken?: string;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Prepares work items to be combined for custom promotion.
 * POST /services/data/v{version}/connect/devops/pipelines/{pipelineId}/promote/combine/prepare
 */
export async function combineWorkItemsPrepare(
  params: CombineWorkItemsPrepareParams
): Promise<CombineWorkItemsPrepareResult> {
  const { connection, pipelineId, parentWorkItemId, childWorkItemIds, sourceStageId, targetStageId } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines/${pipelineId}/promote/combine/prepare`;
  const body = JSON.stringify({
    parentWorkitemId: parentWorkItemId,
    childWorkitemsId: childWorkItemIds,
    sourceStageId,
    targetStageId,
  });

  const data = await connection.request<CombineWorkItemsPrepareResponse>({
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
