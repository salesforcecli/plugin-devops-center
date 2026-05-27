/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
