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

export type UpdateWorkItemParams = {
  connection: Connection;
  workItemId: string;
  projectId: string;
  status?: string;
  subject?: string;
  description?: string;
};

export type UpdateWorkItemResult = {
  success: boolean;
  workItemId: string;
  workItemName?: string;
  status?: string;
  subject?: string;
  description?: string;
  error?: string;
};

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

/**
 * Updates fields on a DevOps Center work item via the Connect API.
 * PATCH /services/data/v{version}/connect/devops/projects/{projectId}/workitem/{workItemId}
 */
export async function updateWorkItem(params: UpdateWorkItemParams): Promise<UpdateWorkItemResult> {
  const { connection, workItemId, projectId, status, subject, description } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/projects/${projectId}/workitem/${workItemId}`;
  const payload: Record<string, string> = {};
  if (status !== undefined) payload.status = toApiStatus(status);
  if (subject !== undefined) payload.subject = subject;
  if (description !== undefined) payload.description = description;

  const response = await connection.request({
    method: 'PATCH',
    url: path,
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

  const data = (response as Record<string, unknown>) ?? {};
  return {
    success: true,
    workItemId,
    status: status !== undefined ? ((data.status ?? data.Status ?? status) as string) : undefined,
    subject: subject !== undefined ? ((data.subject ?? data.Subject ?? subject) as string) : undefined,
    description:
      description !== undefined ? ((data.description ?? data.Description ?? description) as string) : undefined,
  };
}
