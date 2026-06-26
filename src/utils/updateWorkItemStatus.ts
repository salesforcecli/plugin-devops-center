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

export type WorkItemContext = {
  workItemId: string;
  projectId: string;
};

export type UpdateWorkItemStatusParams = {
  connection: Connection;
  workItemId: string;
  projectId: string;
  status: string;
};

export type UpdateWorkItemStatusResult = {
  success: boolean;
  workItemId: string;
  workItemName?: string;
  status?: string;
  error?: string;
};

/**
 * Resolves a work item's Salesforce ID and project ID from its Name (e.g. WI-000001) via SOQL.
 */
export async function resolveWorkItemByName(connection: Connection, workItemName: string): Promise<WorkItemContext> {
  const result = await connection.query<{ Id: string; DevopsProjectId: string }>(
    `SELECT Id, DevopsProjectId FROM WorkItem WHERE Name = '${workItemName}' LIMIT 1`
  );
  const record = (result.records ?? [])[0];
  if (!record) {
    throw new Error(`Work item with name '${workItemName}' not found.`);
  }
  return { workItemId: record.Id, projectId: record.DevopsProjectId };
}

/**
 * Fetches the project ID for a given work item ID via SOQL.
 */
export async function resolveProjectIdForWorkItem(connection: Connection, workItemId: string): Promise<string> {
  const result = await connection.query<{ DevopsProjectId: string }>(
    `SELECT DevopsProjectId FROM WorkItem WHERE Id = '${workItemId}' LIMIT 1`
  );
  const record = (result.records ?? [])[0];
  if (!record) {
    throw new Error(`Work item with ID '${workItemId}' not found.`);
  }
  return record.DevopsProjectId;
}

export const ALLOWED_STATUSES = ['In Progress', 'Ready to Promote'] as const;
export type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

const STATUS_LABEL_TO_API: Record<string, string> = {
  'in progress': 'IN_PROGRESS',
  'ready to promote': 'READY_TO_PROMOTE',
};

export function toApiStatus(status: string): string {
  const apiStatus = STATUS_LABEL_TO_API[status.toLowerCase()];
  if (!apiStatus) {
    throw new Error(`Invalid status "${status}". Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
  }
  return apiStatus;
}

/**
 * Updates the status of a DevOps Center work item via the Connect API.
 * API: PATCH /services/data/v{version}/connect/devops/projects/{projectId}/workitem/{workItemId}
 */
export async function updateWorkItemStatus(params: UpdateWorkItemStatusParams): Promise<UpdateWorkItemStatusResult> {
  const { connection, workItemId, projectId, status } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/projects/${projectId}/workitem/${workItemId}`;
  const body = JSON.stringify({ status: toApiStatus(status) });

  const response = await connection.request({
    method: 'PATCH',
    url: path,
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  const data = (response as Record<string, unknown>) ?? {};
  return {
    success: true,
    workItemId,
    status: (data.status ?? data.Status ?? status) as string,
  };
}
