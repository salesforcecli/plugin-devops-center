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
  computeFirstStageId,
  fetchPipelineStages,
  findStageById,
  getBranchNameFromStage,
  getPipelineIdForProject,
  resolveTargetStageId,
} from './pipelineUtils.js';
import { WorkItem, ProjectStagesContext, VcsType, WorkItemQueryRecord } from './types.js';
import { validateSalesforceId } from './soqlUtils.js';

function normalizeProvider(provider: unknown): string | undefined {
  if (!provider) return undefined;
  const normalized = String(provider).toLowerCase();
  if (normalized === 'bitbucketcloud') {
    return 'bitbucket';
  }
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

  const obj = payload as Record<string, unknown>;
  if (typeof obj.owner === 'string' && obj.owner.trim()) {
    return obj.owner.trim();
  }

  const list = (obj.owners || obj.items || obj.records) as unknown[];
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

async function fetchVcsOwnersForRecords(
  connection: Connection,
  records: WorkItemQueryRecord[]
): Promise<Map<string, string>> {
  const providerOwnerMap = new Map<string, string>();
  const vcsTypes = new Set<VcsType>();

  for (const item of records) {
    const provider = item.SourceCodeRepositoryBranch?.SourceCodeRepository?.Provider;
    const vcsType = providerToVcsType(provider);
    if (vcsType) vcsTypes.add(vcsType);
  }

  await Promise.all(
    Array.from(vcsTypes).map(async (vcsType) => {
      try {
        const owner = await fetchOwnerByVcsType(connection, vcsType);
        if (!owner) return;
        if (vcsType === 'GITHUB') providerOwnerMap.set('github', owner);
        else if (vcsType === 'BITBUCKET') providerOwnerMap.set('bitbucket', owner);
      } catch {
        // Fall back to RepositoryOwner from work item when Connect API owner lookup fails.
      }
    })
  );

  return providerOwnerMap;
}

function buildRepositoryInfo(
  item: WorkItemQueryRecord,
  providerOwnerMap?: Map<string, string>
): { repoUrl?: string; repoType?: string } {
  const repoName = item.SourceCodeRepositoryBranch?.SourceCodeRepository?.Name ?? undefined;
  const provider = item.SourceCodeRepositoryBranch?.SourceCodeRepository?.Provider;
  const normalizedProvider = normalizeProvider(provider);
  const ownerFromConnectApi = normalizedProvider ? providerOwnerMap?.get(normalizedProvider) : undefined;
  const ownerFromRepository = item.SourceCodeRepositoryBranch?.SourceCodeRepository?.RepositoryOwner ?? undefined;
  const repoOwner =
    normalizedProvider === 'bitbucket'
      ? ownerFromRepository ?? ownerFromConnectApi
      : ownerFromConnectApi ?? ownerFromRepository;

  let repoUrl: string | undefined;
  let repoType: string | undefined;
  if (normalizedProvider && repoOwner && repoName) {
    if (normalizedProvider === 'github') {
      repoType = 'github';
      repoUrl = `https://github.com/${repoOwner}/${repoName}`;
    } else if (normalizedProvider === 'bitbucket') {
      repoType = 'bitbucket';
      repoUrl = `https://bitbucket.org/${repoOwner}/${repoName}`;
    } else {
      repoType = normalizedProvider;
    }
  }
  return { repoUrl, repoType };
}

async function ensureProjectStages(
  connection: Connection,
  cache: Map<string, ProjectStagesContext | null>,
  projectId?: string
): Promise<ProjectStagesContext | null> {
  if (!projectId) return null;
  if (cache.has(projectId)) return cache.get(projectId) ?? null;

  const pipelineId = await getPipelineIdForProject(connection, projectId);
  if (!pipelineId) {
    cache.set(projectId, null);
    return null;
  }
  const stages = await fetchPipelineStages(connection, pipelineId);
  if (!stages?.length) {
    cache.set(projectId, null);
    return null;
  }
  const firstStageId = computeFirstStageId(stages);
  const ctx: ProjectStagesContext = { pipelineId, stages, firstStageId };
  cache.set(projectId, ctx);
  return ctx;
}

function mapRawItemToWorkItem(
  item: WorkItemQueryRecord,
  ctx: ProjectStagesContext | null,
  providerOwnerMap?: Map<string, string>
): WorkItem {
  const { repoUrl, repoType } = buildRepositoryInfo(item, providerOwnerMap);

  const mapped: WorkItem = {
    id: item.Id,
    name: item.Name ?? '',
    subject: item.Subject ?? undefined,
    description: item.Description ?? undefined,
    status: item.Status ?? '',
    owner: item.AssignedToId ?? '',
    SourceCodeRepository: repoUrl ?? repoType ? { repoUrl: repoUrl ?? '', repoType: repoType ?? '' } : undefined,
    WorkItemBranch: item.SourceCodeRepositoryBranch?.Name ?? undefined,
    PipelineStageId: item.DevopsPipelineStageId ?? undefined,
    DevopsProjectId: item.DevopsProjectId,
    PipelineId: ctx?.pipelineId,
  };

  if (ctx) {
    let targetStageId = resolveTargetStageId(mapped.PipelineStageId, ctx.stages);
    if (!targetStageId) {
      targetStageId = ctx.firstStageId;
    }
    const targetStage = findStageById(ctx.stages, targetStageId);
    mapped.TargetBranch = getBranchNameFromStage(targetStage);
    mapped.TargetStageId = targetStageId;
  }

  return mapped;
}

export async function fetchWorkItems(connection: Connection, projectId: string): Promise<WorkItem[]> {
  validateSalesforceId(projectId, 'project');
  const query = `
    SELECT
      Id, Name, Subject, Description, Status, AssignedToId,
      SourceCodeRepositoryBranchId,
      SourceCodeRepositoryBranch.Name,
      SourceCodeRepositoryBranch.SourceCodeRepositoryId,
      SourceCodeRepositoryBranch.SourceCodeRepository.Name,
      SourceCodeRepositoryBranch.SourceCodeRepository.RepositoryOwner,
      SourceCodeRepositoryBranch.SourceCodeRepository.Provider,
      DevopsPipelineStageId,
      DevopsProjectId
    FROM WorkItem
    WHERE DevopsProjectId = '${projectId}'
  `;

  const result = await connection.query<WorkItemQueryRecord>(query);
  const records = result.records ?? [];
  const projectStagesCache = new Map<string, ProjectStagesContext | null>();
  const ctx = await ensureProjectStages(connection, projectStagesCache, projectId);
  const providerOwnerMap = await fetchVcsOwnersForRecords(connection, records);

  return records.map((item): WorkItem => mapRawItemToWorkItem(item, ctx, providerOwnerMap));
}
