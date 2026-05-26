/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import {
  computeFirstStageId,
  fetchPipelineStages,
  findStageById,
  getBranchNameFromStage,
  getPipelineIdForProject,
  resolveTargetStageId,
} from './pipelineUtils';
import { WorkItem, ProjectStagesContext, VcsType } from './types';

const API_VERSION = 'v65.0';

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
  if (typeof obj.owner === 'string' && (obj.owner as string).trim()) {
    return (obj.owner as string).trim();
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
  const path = `/services/data/${API_VERSION}/connect/devops/vcs/${vcsType}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (connection as any).request({ method: 'GET', url: path });
  return extractOwnerFromVcsPayload(response);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchVcsOwnersForRecords(connection: Connection, records: any[]): Promise<Map<string, string>> {
  const providerOwnerMap = new Map<string, string>();
  const vcsTypes = new Set<VcsType>();

  for (const item of records) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const provider = item?.SourceCodeRepositoryBranch?.SourceCodeRepository?.Provider;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRepositoryInfo(item: any, providerOwnerMap?: Map<string, string>): { repoUrl?: string; repoType?: string } {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const repoName = item?.SourceCodeRepositoryBranch?.SourceCodeRepository?.Name as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const provider = item?.SourceCodeRepositoryBranch?.SourceCodeRepository?.Provider;
  const normalizedProvider = normalizeProvider(provider);
  const ownerFromConnectApi = normalizedProvider ? providerOwnerMap?.get(normalizedProvider) : undefined;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const ownerFromRepository = item?.SourceCodeRepositoryBranch?.SourceCodeRepository?.RepositoryOwner as string | undefined;
  const repoOwner =
    normalizedProvider === 'bitbucket'
      ? ownerFromRepository || ownerFromConnectApi
      : ownerFromConnectApi || ownerFromRepository;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRawItemToWorkItem(item: any, ctx: ProjectStagesContext | null, providerOwnerMap?: Map<string, string>): WorkItem {
  const { repoUrl, repoType } = buildRepositoryInfo(item, providerOwnerMap);

  const mapped: WorkItem = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    id: item?.Id,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    name: (item?.Name as string) || '',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    subject: (item?.Subject as string) || undefined,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    description: (item?.Description as string) || undefined,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    status: (item?.Status as string) || '',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    owner: (item?.AssignedToId as string) || '',
    SourceCodeRepository:
      repoUrl || repoType ? { repoUrl: repoUrl || '', repoType: repoType || '' } : undefined,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    WorkItemBranch: (item?.SourceCodeRepositoryBranch?.Name as string) || undefined,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    PipelineStageId: item?.DevopsPipelineStageId,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    DevopsProjectId: item?.DevopsProjectId,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await connection.query(query);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!result || !result.records) return [];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const records: any[] = result.records;
  const projectStagesCache = new Map<string, ProjectStagesContext | null>();
  const ctx = await ensureProjectStages(connection, projectStagesCache, projectId);
  const providerOwnerMap = await fetchVcsOwnersForRecords(connection, records);

  return records.map((item): WorkItem => mapRawItemToWorkItem(item, ctx, providerOwnerMap));
}
