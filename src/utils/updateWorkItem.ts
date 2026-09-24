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
import { escapeSOQL, validateSalesforceId } from './soqlUtils.js';

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

/**
 * Allowed current statuses for each target status a user can set. A work item may only move
 * to IN_PROGRESS while it is NEW, and to READY_TO_PROMOTE while it is IN_REVIEW. Target statuses
 * absent from this map have no precondition.
 */
export const STATUS_TRANSITION_PRECONDITIONS: Record<string, readonly string[]> = {
  IN_PROGRESS: ['NEW'],
  READY_TO_PROMOTE: ['IN_REVIEW'],
};

/**
 * Verifies that the work item's current status permits the requested transition. Throws with a
 * descriptive error when it does not. Only runs a query when the target status has a precondition,
 * so subject/description-only updates are unaffected.
 */
export async function assertStatusTransitionAllowed(
  connection: Connection,
  workItemId: string,
  targetApiStatus: string
): Promise<void> {
  const allowedFrom = STATUS_TRANSITION_PRECONDITIONS[targetApiStatus];
  if (!allowedFrom) {
    return;
  }
  validateSalesforceId(workItemId, 'work item');
  const result = await connection.query<{ Status: string }>(
    `SELECT Status FROM WorkItem WHERE Id = '${workItemId}' LIMIT 1`
  );
  const current = result.records?.[0]?.Status;
  if (!current) {
    throw new Error(`Work item with ID '${workItemId}' not found.`);
  }
  if (!allowedFrom.includes(current)) {
    const allowed = allowedFrom.join(', ');
    throw new Error(
      `Cannot change status to ${targetApiStatus}: the work item is currently ${current}, but this transition is only allowed from ${allowed}.`
    );
  }
}

export async function resolveWorkItemByName(connection: Connection, workItemName: string): Promise<WorkItemContext> {
  const result = await connection.query<{ Id: string; DevopsProjectId: string }>(
    `SELECT Id, DevopsProjectId FROM WorkItem WHERE Name = '${escapeSOQL(workItemName)}' LIMIT 1`
  );
  const record = (result.records ?? [])[0];
  if (!record) {
    throw new Error(`Work item with name '${workItemName}' not found.`);
  }
  return { workItemId: record.Id, projectId: record.DevopsProjectId };
}

export async function resolveProjectIdForWorkItem(connection: Connection, workItemId: string): Promise<string> {
  validateSalesforceId(workItemId, 'work item');
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
 * Updates a DevOps Center work item.
 *
 * Subject and description are plain WorkItem sObject fields — the DevOps Center connect work item
 * endpoint does not accept them — so they are written via the sObject API. Status changes go
 * through the connect endpoint (PATCH /connect/devops/projects/{projectId}/workitem/{workItemId}),
 * which is the only field that endpoint accepts, so platform-side status handling runs.
 */
export async function updateWorkItem(params: UpdateWorkItemParams): Promise<UpdateWorkItemResult> {
  const { connection, workItemId, projectId, status, subject, description } = params;

  // Validate the status transition before writing any field. This guard is read-only, so running it
  // first avoids persisting subject/description when the status change would be rejected — otherwise
  // a combined --subject/--status call could silently keep the subject change after throwing.
  let apiStatus: string | undefined;
  if (status !== undefined) {
    apiStatus = toApiStatus(status);
    await assertStatusTransitionAllowed(connection, workItemId, apiStatus);
  }

  if (subject !== undefined || description !== undefined) {
    const fields: { Id: string; Subject?: string; Description?: string } = { Id: workItemId };
    if (subject !== undefined) fields.Subject = subject;
    if (description !== undefined) fields.Description = description;
    const saveResult = await connection.sobject('WorkItem').update(fields);
    if (!saveResult.success) {
      const errorMsg = saveResult.errors
        .map((e) => (typeof e === 'string' ? e : e.message))
        .filter(Boolean)
        .join('; ');
      return { success: false, workItemId, error: errorMsg || 'Failed to update work item fields.' };
    }
  }

  if (apiStatus) {
    const path = `/services/data/v${connection.getApiVersion()}/connect/devops/projects/${projectId}/workitem/${workItemId}`;
    await connection.request({
      method: 'PATCH',
      url: path,
      body: JSON.stringify({ status: apiStatus }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return {
    success: true,
    workItemId,
    status: apiStatus,
    subject,
    description,
  };
}
