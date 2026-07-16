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

export type UpdateProjectParams = {
  connection: Connection;
  projectId: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateProjectResult = {
  success: boolean;
  projectId?: string;
  description?: string;
  isActive?: boolean;
  error?: string;
};

export async function resolveProjectByName(connection: Connection, projectName: string): Promise<string> {
  const result = await connection.query<{ Id: string }>(
    `SELECT Id FROM DevopsProject WHERE Name = '${projectName.replace(/'/g, "\\'")}' LIMIT 1`
  );
  if (!result.records.length) {
    throw new Error(`Project not found: ${projectName}`);
  }
  return result.records[0].Id;
}

export async function updateProject(params: UpdateProjectParams): Promise<UpdateProjectResult> {
  const { connection, projectId, description, isActive } = params;

  const updatePayload: { Id: string; Description?: string; IsActive?: boolean } = { Id: projectId };
  if (description !== undefined) updatePayload.Description = description;
  if (isActive !== undefined) updatePayload.IsActive = isActive;

  const result = await connection.sobject('DevopsProject').update(updatePayload);

  if (result.success) {
    return {
      success: true,
      projectId,
      description,
      isActive,
    };
  }

  const errorMessages = result.errors?.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ');
  return {
    success: false,
    error: errorMessages ?? 'Unknown error',
  };
}
