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

export type AddPipelineStageParams = {
  connection: Connection;
  pipelineId: string;
  name: string;
  nextStageId: string;
};

export type AddPipelineStageResult = {
  success: boolean;
  stageId?: string;
  name?: string;
  nextStageId?: string;
  pipelineId?: string;
  error?: string;
};

type SObjectCreateResult = {
  id: string;
  success: boolean;
  errors?: Array<{ message: string }>;
};

/**
 * Adds a stage to a DevOps Center pipeline via sObject create.
 * POST /services/data/v{version}/sobjects/DevopsPipelineStage
 */
export async function addPipelineStage(params: AddPipelineStageParams): Promise<AddPipelineStageResult> {
  const { connection, pipelineId, name, nextStageId } = params;

  const result = await connection.sobject('DevopsPipelineStage').create({
    Name: name,
    DevopsPipelineId: pipelineId,
    NextStageId: nextStageId,
  });

  const createResult = result as unknown as SObjectCreateResult;

  if (!createResult.success) {
    const errorMsg = createResult.errors?.map((e) => e.message).join('; ') ?? 'Unknown error';
    return {
      success: false,
      error: errorMsg,
    };
  }

  return {
    success: true,
    stageId: createResult.id,
    name,
    nextStageId,
    pipelineId,
  };
}
