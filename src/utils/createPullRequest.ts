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
import {
  getPipelineIdForProject,
  fetchPipelineStages,
  computeFirstStageId,
  findStageById,
  getBranchNameFromStage,
  resolveTargetStageId,
} from './pipelineUtils.js';
import { WorkItemQueryRecord } from './types.js';
import { escapeSOQL, validateSalesforceId } from './soqlUtils.js';

export type WorkItemDetail = {
  workItemId: string;
  workItemName: string;
  subject: string;
  branchName?: string;
  targetBranch?: string;
  projectId: string;
  provider?: string;
};

export type CreatePullRequestResult = {
  success: boolean;
  workItemName?: string;
  url?: string;
  sourceBranch?: string;
  targetBranch?: string;
  error?: string;
};

type ReviewResponse = {
  reviewUrl?: string;
  status?: string;
  success?: boolean;
  errorMessage?: string;
  error?: string;
  message?: string;
};

function normalizeProvider(provider: unknown): string | undefined {
  if (!provider) return undefined;
  const normalized = String(provider).toLowerCase();
  if (normalized === 'bitbucketcloud') return 'bitbucket';
  return normalized;
}

/**
 * Queries a work item (by Name or Id) and resolves info needed to create a pull request.
 */
export async function fetchWorkItemDetail(
  connection: Connection,
  filter: { name: string } | { id: string }
): Promise<WorkItemDetail> {
  const whereClause =
    'name' in filter ? `Name = '${escapeSOQL(filter.name)}'` : `Id = '${validateSalesforceId(filter.id, 'work item')}'`;
  const identifier = 'name' in filter ? filter.name : filter.id;

  const result = await connection.query<WorkItemQueryRecord>(
    `SELECT Id, Name, Subject, DevopsProjectId, DevopsPipelineStageId,
            SourceCodeRepositoryBranch.Name,
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

  const detail: WorkItemDetail = {
    workItemId: record.Id,
    workItemName: record.Name,
    subject: record.Subject ?? '',
    branchName: record.SourceCodeRepositoryBranch?.Name ?? undefined,
    projectId: record.DevopsProjectId,
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

function extractPrError(response: ReviewResponse): string {
  const raw = String(response.errorMessage ?? response.error ?? response.message ?? 'Pull request creation failed');
  // Try to extract inner VCS error from "REVIEW_CREATION_FAILED:Failed to create pull request: ..."
  const innerMatch = raw.match(/Failed to create pull request:\s*(.+)/s);
  const inner = innerMatch ? innerMatch[1].trim() : raw;
  // Try to parse JSON error body from named credential callout responses
  try {
    const parsed = JSON.parse(inner) as { error?: { message?: string }; message?: string };
    const msg = parsed?.error?.message ?? parsed?.message;
    if (msg) return String(msg);
  } catch {
    // not JSON, use as-is
  }
  if (inner.includes('no changes')) {
    return 'The branch has no commits ahead of the target branch. Push your changes and try again.';
  }
  return inner;
}

/**
 * Creates a pull request via the Salesforce Connect API.
 * POST /connect/devops/workItems/{workItemId}/review
 * Salesforce handles VCS authentication and workspace resolution.
 */
export async function createPullRequest(connection: Connection, workItemId: string): Promise<CreatePullRequestResult> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/workItems/${workItemId}/review`;

  let response: ReviewResponse;
  try {
    response = await connection.request<ReviewResponse>({
      method: 'POST',
      url: path,
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e);
    throw new Error(extractPrError({ errorMessage: raw }));
  }

  const isError = response.status === 'Error' || response.success === false || !!response.errorMessage;
  if (isError) {
    throw new Error(extractPrError(response));
  }

  return {
    success: true,
    url: response.reviewUrl,
  };
}

/**
 * Attempts to resolve a GitHub authentication token from the environment or the gh CLI.
 * Used by pipeline create for pre-flight owner validation.
 */
export function resolveGitHubToken(): Promise<string | undefined> {
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (envToken) return Promise.resolve(envToken);

  try {
    // execSync with a fixed string — no user input, no injection risk
    const token = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (token) return Promise.resolve(token);
  } catch {
    // gh CLI not installed or not authenticated
  }
  return Promise.resolve(undefined);
}
