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
import { DevopsProjectPipelineQueryRecord, PipelineStageRecord } from './types.js';

export async function getPipelineIdForProject(connection: Connection, projectId: string): Promise<string | undefined> {
  const query = `SELECT DevopsPipelineId FROM DevopsProjectPipeline WHERE DevopsProjectId = '${projectId}' LIMIT 1`;
  const result = await connection.query<DevopsProjectPipelineQueryRecord>(query);
  return (result.records ?? [])[0]?.DevopsPipelineId;
}

export async function fetchPipelineStages(connection: Connection, pipelineId: string): Promise<PipelineStageRecord[]> {
  const stageQuery = `SELECT Id, Name, NextStageId, SourceCodeRepositoryBranch.Name FROM DevopsPipelineStage WHERE DevopsPipelineId = '${pipelineId}'`;
  const stageResult = await connection.query<PipelineStageRecord>(stageQuery);
  return stageResult.records ?? [];
}

export function computeFirstStageId(stages: PipelineStageRecord[]): string | undefined {
  const allStageIds = new Set<string>(stages.map((s) => s.Id));
  const nextStageIds = new Set<string>(stages.map((s) => s.NextStageId).filter(Boolean) as string[]);
  const firstStageIds: string[] = Array.from(allStageIds).filter((id) => !nextStageIds.has(id));
  if (firstStageIds.length !== 1) return undefined;
  return firstStageIds[0];
}

export function resolveTargetStageId(
  currentStageId: string | undefined,
  stages: PipelineStageRecord[]
): string | undefined {
  if (!stages.length) return undefined;
  if (currentStageId) {
    const current = stages.find((s) => s.Id === currentStageId);
    return current?.NextStageId ?? undefined;
  }
  return undefined;
}

export function findStageById(
  stages: PipelineStageRecord[],
  stageId: string | undefined
): PipelineStageRecord | undefined {
  if (!stageId) return undefined;
  return stages.find((s) => s.Id === stageId);
}

export function getBranchNameFromStage(stage: PipelineStageRecord | undefined): string | undefined {
  return stage?.SourceCodeRepositoryBranch?.Name ?? undefined;
}
