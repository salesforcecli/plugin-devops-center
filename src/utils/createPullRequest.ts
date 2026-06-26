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
import {
  getPipelineIdForProject,
  fetchPipelineStages,
  computeFirstStageId,
  findStageById,
  getBranchNameFromStage,
  resolveTargetStageId,
} from './pipelineUtils.js';
import { WorkItemQueryRecord, VcsType } from './types.js';

export type WorkItemDetail = {
  workItemId: string;
  workItemName: string;
  subject: string;
  branchName?: string;
  targetBranch?: string;
  projectId: string;
  repoOwner?: string;
  repoName?: string;
  provider?: string;
};

export type CreatePullRequestParams = {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body?: string;
  provider: string;
  token: string;
};

export type CreatePullRequestResult = {
  success: boolean;
  workItemName?: string;
  title?: string;
  url?: string;
  sourceBranch?: string;
  targetBranch?: string;
  error?: string;
};

type VcsOwnerPayload = {
  owner?: string;
  owners?: unknown[];
  items?: unknown[];
  records?: unknown[];
};

function normalizeProvider(provider: unknown): string | undefined {
  if (!provider) return undefined;
  const normalized = String(provider).toLowerCase();
  if (normalized === 'bitbucketcloud') return 'bitbucket';
  return normalized;
}

function providerToVcsType(provider: unknown): VcsType | undefined {
  const normalized = normalizeProvider(provider);
  if (normalized === 'github') return 'GITHUB';
  if (normalized === 'bitbucket') return 'BITBUCKET';
  return undefined;
}

function extractOwnerFromVcsPayload(payload: unknown): string | undefined {
  if (!payload) return undefined;
  if (typeof payload === 'string') return payload.trim() || undefined;
  const obj = payload as VcsOwnerPayload;
  if (typeof obj.owner === 'string' && obj.owner.trim()) return obj.owner.trim();
  const list = (obj.owners ?? obj.items ?? obj.records) as unknown[];
  if (Array.isArray(list)) {
    for (const candidate of list) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      if (candidate && typeof candidate === 'object') {
        const ownerVal = (candidate as Record<string, unknown>).owner;
        if (typeof ownerVal === 'string' && ownerVal.trim()) return ownerVal.trim();
      }
    }
  }
  return undefined;
}

async function fetchOwnerByVcsType(connection: Connection, vcsType: VcsType): Promise<string | undefined> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/vcs/${vcsType}`;
  const response: unknown = await connection.request({ method: 'GET', url: path });
  return extractOwnerFromVcsPayload(response);
}

/**
 * Queries a work item (by Name or Id) and resolves all info needed
 * to create a pull request: branch, repo, owner, provider, and target branch.
 */
export async function fetchWorkItemDetail(
  connection: Connection,
  filter: { name: string } | { id: string }
): Promise<WorkItemDetail> {
  const whereClause = 'name' in filter ? `Name = '${filter.name}'` : `Id = '${filter.id}'`;
  const identifier = 'name' in filter ? filter.name : filter.id;

  const result = await connection.query<WorkItemQueryRecord>(
    `SELECT Id, Name, Subject, DevopsProjectId, DevopsPipelineStageId,
            SourceCodeRepositoryBranch.Name,
            SourceCodeRepositoryBranch.SourceCodeRepository.Name,
            SourceCodeRepositoryBranch.SourceCodeRepository.RepositoryOwner,
            SourceCodeRepositoryBranch.SourceCodeRepository.Provider
     FROM WorkItem
     WHERE ${whereClause}
     LIMIT 1`
  );
  const record = (result.records ?? [])[0];
  if (!record) {
    throw new Error(`Work item '${identifier}' not found.`);
  }

  const provider = normalizeProvider(record.SourceCodeRepositoryBranch?.SourceCodeRepository?.Provider);
  let repoOwner = record.SourceCodeRepositoryBranch?.SourceCodeRepository?.RepositoryOwner ?? undefined;

  const vcsType = providerToVcsType(provider);
  if (vcsType && !repoOwner) {
    try {
      repoOwner = (await fetchOwnerByVcsType(connection, vcsType)) ?? undefined;
    } catch {
      // owner lookup is best-effort
    }
  }

  const detail: WorkItemDetail = {
    workItemId: record.Id,
    workItemName: record.Name,
    subject: record.Subject ?? '',
    branchName: record.SourceCodeRepositoryBranch?.Name ?? undefined,
    projectId: record.DevopsProjectId,
    repoOwner,
    repoName: record.SourceCodeRepositoryBranch?.SourceCodeRepository?.Name ?? undefined,
    provider,
  };

  const pipelineId = await getPipelineIdForProject(connection, record.DevopsProjectId);
  if (pipelineId) {
    const stages = await fetchPipelineStages(connection, pipelineId);
    if (stages.length) {
      let targetStageId = resolveTargetStageId(record.DevopsPipelineStageId ?? undefined, stages);
      if (!targetStageId) {
        targetStageId = computeFirstStageId(stages);
      }
      detail.targetBranch = getBranchNameFromStage(findStageById(stages, targetStageId));
    }
  }

  return detail;
}

/**
 * Creates a pull request on GitHub or Bitbucket using their REST APIs.
 */
export async function createPullRequest(params: CreatePullRequestParams): Promise<CreatePullRequestResult> {
  const { owner, repo, head, base, title, body, provider, token } = params;

  if (provider === 'github') {
    return createGitHubPullRequest({ owner, repo, head, base, title, body, token });
  } else if (provider === 'bitbucket') {
    return createBitbucketPullRequest({ owner, repo, head, base, title, body, token });
  }
  throw new Error(`Unsupported VCS provider: ${provider ?? 'unknown'}. Supported providers are GitHub and Bitbucket.`);
}

async function createGitHubPullRequest(params: {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body?: string;
  token: string;
}): Promise<CreatePullRequestResult> {
  const { owner, repo, head, base, title, body, token } = params;
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body: body ?? '', head, base }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errors = Array.isArray(data.errors)
      ? (data.errors as Array<Record<string, unknown>>).map((e) => e.message ?? JSON.stringify(e)).join('; ')
      : undefined;
    const msg = (data.message as string) ?? `HTTP ${response.status}`;
    throw new Error(errors ? `${msg}: ${errors}` : msg);
  }

  return {
    success: true,
    title: data.title as string,
    url: data.html_url as string,
    sourceBranch: head,
    targetBranch: base,
  };
}

async function createBitbucketPullRequest(params: {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body?: string;
  token: string;
}): Promise<CreatePullRequestResult> {
  const { owner, repo, head, base, title, body, token } = params;
  const url = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/pullrequests`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description: body ?? '',
      source: { branch: { name: head } },
      destination: { branch: { name: base } },
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorMsg = (data.error as Record<string, unknown>)?.message ?? data.message ?? `HTTP ${response.status}`;
    throw new Error(String(errorMsg));
  }

  const links = data.links as Record<string, Record<string, string>> | undefined;
  return {
    success: true,
    title: data.title as string,
    url: links?.html?.href ?? (data.url as string) ?? '',
    sourceBranch: head,
    targetBranch: base,
  };
}

/**
 * Attempts to resolve a VCS authentication token from the environment
 * or the `gh` CLI (for GitHub).
 */
export async function resolveGitHubToken(): Promise<string | undefined> {
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (envToken) return envToken;

  try {
    const { execSync } = await import('node:child_process');
    const token = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (token) return token;
  } catch {
    // gh CLI not installed or not authenticated
  }
  return undefined;
}
