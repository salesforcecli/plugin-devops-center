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

import { execSync } from 'node:child_process';
import { Connection } from '@salesforce/core';

export type RepoInfo = {
  repoUrl: string;
  repoType: string;
  created: boolean;
};

export type CreatePipelineParams = {
  connection: Connection;
  name: string;
  repo: string;
  repoType: string;
  createRepo?: boolean;
  repoOwner?: string;
  bitbucketWorkspace?: string;
  bitbucketProjectKey?: string;
  stages?: string[];
};

export type CreatePipelineResult = {
  success: boolean;
  pipelineId?: string;
  name?: string;
  status?: string;
  repository?: RepoInfo;
  error?: string;
};

type ConnectPipelineResponse = {
  id: string;
  message: string;
  status: string;
};

const DEFAULT_STAGE_NAMES = ['Integration', 'UAT', 'Staging', 'Production'];

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
 * Validates that a GitHub owner (org or user) exists.
 * Primary: uses `gh api` which handles keyring-based auth automatically.
 * Fallback: direct GitHub API call with token (for environments without gh CLI).
 * Skips validation silently when neither mechanism can authenticate, so we
 * don't block the command when the check itself is unavailable.
 */
export async function validateGitHubOwner(owner: string, token?: string, fetchFn: typeof fetch = fetch): Promise<void> {
  const encoded = encodeURIComponent(owner);
  try {
    // Try user first, then org — owner may be either a personal account or an organization
    try {
      execSync(`gh api users/${encoded}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return;
    } catch (e: unknown) {
      const stderr = String((e as { stderr?: string }).stderr ?? '');
      const stdout = String((e as { stdout?: string }).stdout ?? '');
      if (!stderr.includes('404') && !stdout.includes('"Not Found"')) throw e;
      // 404 on users/ — try orgs/
    }
    execSync(`gh api orgs/${encoded}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return;
  } catch (e: unknown) {
    const stderr = String((e as { stderr?: string }).stderr ?? '');
    const stdout = String((e as { stdout?: string }).stdout ?? '');
    if (stderr.includes('404') || stdout.includes('"Not Found"')) {
      throw new GitHubOwnerNotFoundError(owner);
    }
    // gh not available or not authenticated — fall through to token-based check
  }

  if (!token) return;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  };
  const userRes = await fetchFn(`https://api.github.com/users/${encoded}`, { headers });
  if (userRes.status !== 404) return;
  const orgRes = await fetchFn(`https://api.github.com/orgs/${encoded}`, { headers });
  if (orgRes.status === 404) throw new GitHubOwnerNotFoundError(owner);
  // 403 or other non-404: skip validation
}

export class GitHubOwnerNotFoundError extends Error {
  public readonly owner: string;
  public constructor(owner: string) {
    super(`GitHub owner "${owner}" does not exist`);
    this.owner = owner;
  }
}

/**
 * Creates a new DevOps Center pipeline via the Connect API.
 * POST /services/data/v{version}/connect/devops/pipelines
 */
export async function createPipeline(params: CreatePipelineParams): Promise<CreatePipelineResult> {
  const { connection, name, repo, repoType, createRepo, repoOwner, bitbucketWorkspace, bitbucketProjectKey, stages } =
    params;

  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/pipelines`;

  const stageNames = stages && stages.length > 0 ? stages : DEFAULT_STAGE_NAMES;

  const payload: Record<string, unknown> = {
    name,
    vcsType: repoType,
    stages: stageNames.map((stageName) => ({ name: stageName })),
  };

  if (createRepo) {
    payload.createVcsRepo = true;
    payload.vcsRepoName = repo;

    if (repoType === 'bitbucket') {
      const providerInfo: Record<string, string> = { bitbucketWorkspace: bitbucketWorkspace! };
      if (bitbucketProjectKey) {
        providerInfo.bitbucketProjectKey = bitbucketProjectKey;
      }
      payload.repoProviderInfo = JSON.stringify(providerInfo);
    } else {
      payload.vcsRepoOwner = repoOwner;
    }
  } else {
    payload.vcsRepoUrl = repo;
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
    status: data.status ?? 'Inactive',
    repository: {
      repoUrl: repo,
      repoType,
      created: createRepo ?? false,
    },
  };
}
