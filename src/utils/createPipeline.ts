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

export type RepoInfo = {
  repoUrl: string;
  repoType: string;
  created: boolean;
};

export type CreatePipelineParams = {
  connection: Connection;
  name: string;
  description?: string;
  repo: string;
  repoType: string;
  createRepo?: boolean;
  repoOwner?: string;
  bitbucketProject?: string;
};

export type CreatePipelineResult = {
  success: boolean;
  pipelineId?: string;
  name?: string;
  description?: string;
  status?: string;
  repository?: RepoInfo;
  error?: string;
};

type ConnectPipelineResponse = {
  id: string;
  message: string;
  status: string;
};

const DEFAULT_STAGES = [{ name: 'Integration' }, { name: 'UAT' }, { name: 'Staging' }, { name: 'Production' }];

/**
 * Detects repo type from a URL. Returns 'github' or 'bitbucket', or undefined.
 */
export function detectRepoType(repoUrl: string): string | undefined {
  const lower = repoUrl.toLowerCase();
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('bitbucket.org')) return 'bitbucket';
  return undefined;
}

/**
 * Creates a new DevOps Center pipeline via the Connect API.
 * POST /services/data/v{version}/connect/devops/pipelines
 */
export async function createPipeline(params: CreatePipelineParams): Promise<CreatePipelineResult> {
  const { connection, name, description, repo, repoType, createRepo, repoOwner, bitbucketProject } = params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines`;

  const payload: Record<string, unknown> = {
    name,
    vcsType: repoType,
    stages: DEFAULT_STAGES,
  };

  if (createRepo) {
    payload.createVcsRepo = true;
    payload.vcsRepoName = repo;
    payload.vcsRepoOwner = repoOwner;

    if (repoType === 'bitbucket' && repoOwner) {
      const providerInfo: Record<string, string> = { bitbucketWorkspace: repoOwner };
      if (bitbucketProject) {
        providerInfo.bitbucketProject = bitbucketProject;
      }
      payload.repoProviderInfo = JSON.stringify(providerInfo);
    }
  } else {
    payload.vcsRepoUrl = repo;
  }

  if (description) {
    payload.description = description;
  }

  const data = await connection.request<ConnectPipelineResponse>({
    method: 'POST',
    url: path,
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    success: true,
    pipelineId: data.id,
    name,
    description,
    status: data.status ?? 'Inactive',
    repository: {
      repoUrl: repo,
      repoType,
      created: createRepo ?? false,
    },
  };
}
