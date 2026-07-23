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
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateProjectResult = {
  success: boolean;
  projectId?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  error?: string;
};

export async function updateProject(params: UpdateProjectParams): Promise<UpdateProjectResult> {
  const { connection, projectId, name, description, isActive } = params;

  const updatePayload: { Id: string; Name?: string; Description?: string; IsActive?: boolean } = { Id: projectId };
  if (name !== undefined) updatePayload.Name = name;
  if (description !== undefined) updatePayload.Description = description;
  if (isActive !== undefined) updatePayload.IsActive = isActive;

  const result = await connection.sobject('DevopsProject').update(updatePayload);

  if (result.success) {
    return {
      success: true,
      projectId,
      name,
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
