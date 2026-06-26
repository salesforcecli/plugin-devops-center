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

export type CreateWorkItemParams = {
  connection: Connection;
  projectId: string;
  subject: string;
  description: string;
};

export type CreateWorkItemResult = {
  success: boolean;
  workItemId?: string;
  workItemName?: string;
  subject?: string;
  error?: string;
};

/**
 * Creates a new DevOps Center Work Item in the specified project.
 * API: POST /services/data/v65.0/connect/devops/projects/<ProjectID>/workitem
 */
export async function createWorkItem(params: CreateWorkItemParams): Promise<CreateWorkItemResult> {
  const { connection, projectId, subject, description } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/projects/${projectId}/workitem`;
  const body = JSON.stringify({ subject, description: description ?? '' });

  try {
    const response = await connection.request({
      method: 'POST',
      url: path,
      body,
      headers: { 'Content-Type': 'application/json' },
    });
    const data = (response as Record<string, unknown>) ?? {};
    return {
      success: true,
      workItemId: (data.id ?? data.Id) as string | undefined,
      workItemName: (data.name ?? data.Name) as string | undefined,
      subject: (data.subject ?? data.Subject ?? subject) as string,
    };
  } catch (error: unknown) {
    const err = error as Record<string, unknown> & { response?: { data?: unknown }; body?: unknown; message?: unknown };
    const data: unknown = (err.response?.data ?? err.body ?? err) as unknown;
    const message: unknown =
      (typeof data === 'object' &&
        data !== null &&
        ((data as Record<string, unknown>).message ??
          (data as Record<string, unknown>).error ??
          (data as Record<string, unknown>).errorDescription)) ||
      err.message ||
      'Unknown error';
    const details =
      typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>).body)
        ? ((data as Record<string, unknown[]>).body as string[]).join('; ')
        : undefined;
    return {
      success: false,
      error: details ? `${String(message)}: ${details}` : String(message),
    };
  }
}
