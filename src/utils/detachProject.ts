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

export type DetachProjectResult = {
  success: boolean;
  projectId: string;
  pipelineId: string;
  error?: string;
};

export async function detachProject(
  connection: Connection,
  projectId: string,
  pipelineId: string
): Promise<DetachProjectResult> {
  const queryResult = await connection.query<{ Id: string }>(
    `SELECT Id FROM DevopsProjectPipeline WHERE DevopsProjectId = '${projectId}' AND DevopsPipelineId = '${pipelineId}' LIMIT 1`
  );

  const junction = (queryResult.records ?? [])[0];
  if (!junction) {
    throw new Error(`ProjectNotAttached:${projectId}:${pipelineId}`);
  }

  const result = await connection.sobject('DevopsProjectPipeline').delete(junction.Id);

  if (result.success) {
    return { success: true, projectId, pipelineId };
  }

  const errorMessages = result.errors?.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ');
  return {
    success: false,
    projectId,
    pipelineId,
    error: errorMessages ?? 'Unknown error',
  };
}
