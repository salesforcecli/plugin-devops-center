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

type DevopsPipelineRecord = {
  Id: string;
  Name: string;
  Description: string | null;
  IsActive: boolean;
};

type StageQueryRecord = {
  Id: string;
  Name: string | null;
  NextStageId: string | null;
  DevopsPipelineId: string;
  SourceCodeRepositoryBranch: {
    Name: string | null;
    SourceCodeRepository: {
      Name: string | null;
      RepositoryOwner: string | null;
    } | null;
  } | null;
  DevOpsEnvironment: {
    Id: string;
    Name: string;
  } | null;
};

type ProjectPipelineRecord = {
  DevopsProjectId: string;
  DevopsProject: { Name: string } | null;
};

export type StageEnvironment = {
  id: string;
  name: string;
};

export type PipelineStageDetail = {
  id: string;
  name: string | null;
  nextStageId: string | null;
  branchName: string | null;
  repositoryName: string | null;
  repositoryOwner: string | null;
  environment: StageEnvironment | null;
};

export type ConnectedProject = {
  id: string;
  name: string | null;
};

export type PipelineGetResult = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  stages: PipelineStageDetail[];
  connectedProjects: ConnectedProject[];
};

function orderStages(stages: PipelineStageDetail[]): PipelineStageDetail[] {
  if (stages.length <= 1) return stages;
  const nextIds = new Set(stages.map((s) => s.nextStageId).filter(Boolean));
  const first = stages.find((s) => !nextIds.has(s.id));
  if (!first) return stages;
  const byId = new Map(stages.map((s) => [s.id, s]));
  const ordered: PipelineStageDetail[] = [];
  let current: PipelineStageDetail | undefined = first;
  while (current) {
    ordered.push(current);
    current = current.nextStageId ? byId.get(current.nextStageId) : undefined;
  }
  return ordered;
}

export async function getPipeline(connection: Connection, pipelineId: string): Promise<PipelineGetResult> {
  const pipelineResult = await connection.query<DevopsPipelineRecord>(
    `SELECT Id, Name, Description, IsActive FROM DevopsPipeline WHERE Id = '${pipelineId}' LIMIT 1`
  );
  const pipeline = (pipelineResult.records ?? [])[0];
  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`);
  }

  const [stageResult, junctionResult] = await Promise.all([
    connection.query<StageQueryRecord>(
      `SELECT Id, Name, NextStageId, DevopsPipelineId, SourceCodeRepositoryBranch.Name, SourceCodeRepositoryBranch.SourceCodeRepository.Name, SourceCodeRepositoryBranch.SourceCodeRepository.RepositoryOwner, DevOpsEnvironment.Id, DevOpsEnvironment.Name FROM DevopsPipelineStage WHERE DevopsPipelineId = '${pipelineId}'`
    ),
    connection.query<ProjectPipelineRecord>(
      `SELECT DevopsProjectId, DevopsProject.Name FROM DevopsProjectPipeline WHERE DevopsPipelineId = '${pipelineId}'`
    ),
  ]);

  const stages = orderStages(
    (stageResult.records ?? []).map((s) => ({
      id: s.Id,
      name: s.Name,
      nextStageId: s.NextStageId ?? null,
      branchName: s.SourceCodeRepositoryBranch?.Name ?? null,
      repositoryName: s.SourceCodeRepositoryBranch?.SourceCodeRepository?.Name ?? null,
      repositoryOwner: s.SourceCodeRepositoryBranch?.SourceCodeRepository?.RepositoryOwner ?? null,
      environment: s.DevOpsEnvironment ? { id: s.DevOpsEnvironment.Id, name: s.DevOpsEnvironment.Name } : null,
    }))
  );

  const connectedProjects = (junctionResult.records ?? []).map((j) => ({
    id: j.DevopsProjectId,
    name: j.DevopsProject?.Name ?? null,
  }));

  return {
    id: pipeline.Id,
    name: pipeline.Name,
    description: pipeline.Description,
    isActive: pipeline.IsActive,
    stages,
    connectedProjects,
  };
}
