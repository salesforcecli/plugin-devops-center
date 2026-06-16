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

export type WorkItem = {
  id: string;
  name: string;
  subject?: string;
  description?: string;
  status: string;
  owner: string;
  DevopsProjectId: string;
  PipelineId?: string;
  PipelineStageId?: string;
  SourceCodeRepository?: {
    repoUrl: string;
    repoType: string;
  };
  WorkItemBranch?: string;
  TargetStageId?: string;
  TargetBranch?: string;
};

export type PipelineStageRecord = {
  Id: string;
  Name?: string;
  NextStageId?: string | null;
  SourceCodeRepositoryBranch?: { Name?: string } | null;
};

export type ProjectStagesContext = {
  pipelineId: string;
  stages: PipelineStageRecord[];
  firstStageId: string | undefined;
};

export type VcsType = 'GITHUB' | 'BITBUCKET';

export type SourceCodeRepositoryQueryRecord = {
  Name: string | null;
  RepositoryOwner: string | null;
  Provider: string | null;
};

export type SourceCodeRepositoryBranchQueryRecord = {
  Name: string | null;
  SourceCodeRepositoryId: string | null;
  SourceCodeRepository: SourceCodeRepositoryQueryRecord | null;
};

export type WorkItemQueryRecord = {
  Id: string;
  Name: string;
  Subject: string | null;
  Description: string | null;
  Status: string;
  AssignedToId: string | null;
  SourceCodeRepositoryBranchId: string | null;
  SourceCodeRepositoryBranch: SourceCodeRepositoryBranchQueryRecord | null;
  DevopsPipelineStageId: string | null;
  DevopsProjectId: string;
};

export type DevopsProjectPipelineQueryRecord = {
  DevopsPipelineId: string;
};
