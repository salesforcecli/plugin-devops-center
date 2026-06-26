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

export type CreateProjectParams = {
  connection: Connection;
  name: string;
  description: string;
};

export type CreateProjectResult = {
  success: boolean;
  projectId?: string;
  name?: string;
  description?: string;
  error?: string;
};

/**
 * Creates a new DevOps Center project via sObject create on DevopsProject.
 */
export async function createProject(params: CreateProjectParams): Promise<CreateProjectResult> {
  const { connection, name, description } = params;

  const result = await connection.sobject('DevopsProject').create({
    Name: name,
    Description: description || null,
  });

  if (result.success) {
    return {
      success: true,
      projectId: result.id,
      name,
      description: description || undefined,
    };
  }

  const errorMessages = result.errors?.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ');
  return {
    success: false,
    error: errorMessages ?? 'Unknown error',
  };
}
