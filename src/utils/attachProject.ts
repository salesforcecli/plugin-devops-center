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

export type AttachProjectParams = {
  connection: Connection;
  projectId: string;
  pipelineId: string;
};

export type AttachProjectResult = {
  success: boolean;
  projectId: string;
  pipelineId: string;
  error?: string;
};

/**
 * Checks if a project is already attached to a pipeline.
 * Returns the existing pipeline ID if found, undefined otherwise.
 */
export async function findExistingAttachment(connection: Connection, projectId: string): Promise<string | undefined> {
  validateSalesforceId(projectId, 'project');
  const result = await connection.query<{ DevopsPipelineId: string }>(
    `SELECT DevopsPipelineId FROM DevopsProjectPipeline WHERE DevopsProjectId = '${projectId}' LIMIT 1`
  );
  return (result.records ?? [])[0]?.DevopsPipelineId;
}

/**
 * Attaches a DevOps Center project to a pipeline by creating a DevopsProjectPipeline junction record.
 */
export async function attachProject(params: AttachProjectParams): Promise<AttachProjectResult> {
  const { connection, projectId, pipelineId } = params;

  const result = await connection.sobject('DevopsProjectPipeline').create({
    DevopsProjectId: projectId,
    DevopsPipelineId: pipelineId,
  });

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
