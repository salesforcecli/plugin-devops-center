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

export type OrgType = 'Production' | 'Sandbox';

const ORG_TYPE_API_MAP: Record<OrgType, string> = {
  Production: 'PRODUCTION',
  Sandbox: 'SANDBOX',
};

export const POLL_INTERVAL_MS = 3000;
export const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export type AddStageEnvironmentParams = {
  connection: Connection;
  pipelineId: string;
  stageId: string;
  environmentName: string;
  orgType: OrgType;
};

export type AddStageEnvironmentResult = {
  success: boolean;
  stageId: string;
  environmentId?: string;
  environmentName?: string;
  orgType?: OrgType;
  pipelineId?: string;
  redirectUrl?: string;
  namedCredential?: string;
  organizationId?: string;
  error?: string;
};

type EnvironmentCreateResponse = {
  id: string;
  name: string;
  redirectUrl: string;
  namedCredential: string;
  externalCredential: string;
  pipelineId?: string;
};

export type EnvironmentGetResponse = {
  id: string;
  name: string;
  organizationId?: string;
  orgType?: string;
  namedCredential?: string;
  redirectUrl?: string;
};

type EnvironmentValidateResponse = {
  id: string;
  name: string;
  organizationId?: string;
  orgType?: string;
  namedCredential?: string;
};

/**
 * Creates an environment and associates it with a pipeline stage via the Connect API.
 * POST /services/data/v{version}/connect/devops/environment
 */
export async function createEnvironment(
  connection: Connection,
  params: { pipelineId: string; stageId: string; environmentName: string; orgType: OrgType }
): Promise<EnvironmentCreateResponse> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/environment`;

  return connection.request<EnvironmentCreateResponse>({
    method: 'POST',
    url: path,
    body: JSON.stringify({
      envName: params.environmentName,
      orgType: ORG_TYPE_API_MAP[params.orgType],
      pipelineStageId: params.stageId,
      pipelineId: params.pipelineId,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Fetches the current state of an environment.
 * GET /services/data/v{version}/connect/devops/environment/{environmentId}
 */
export async function getEnvironment(connection: Connection, environmentId: string): Promise<EnvironmentGetResponse> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/environment/${environmentId}`;
  return connection.request<EnvironmentGetResponse>({ method: 'GET', url: path });
}

/**
 * Validates an authenticated environment by triggering server-side org extraction.
 * PATCH /services/data/v{version}/connect/devops/environment/{environmentId}
 */
export async function validateEnvironment(
  connection: Connection,
  environmentId: string
): Promise<EnvironmentValidateResponse> {
  const path = `/services/data/v${connection.getApiVersion()}/connect/devops/environment/${environmentId}`;
  return connection.request<EnvironmentValidateResponse>({
    method: 'PATCH',
    url: path,
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Polls until authentication is complete by attempting PATCH validation.
 * The PATCH call triggers server-side org extraction; if the user has
 * completed OAuth, it returns a response with organizationId populated.
 * If auth isn't done yet, the PATCH throws — we catch and retry.
 * Falls back to GET polling as a secondary check.
 * Throws on timeout.
 */
// eslint-disable-next-line no-await-in-loop -- polling requires sequential awaits by design
export async function pollForAuthentication(
  connection: Connection,
  environmentId: string,
  timeoutMs: number = POLL_TIMEOUT_MS,
  intervalMs: number = POLL_INTERVAL_MS
): Promise<EnvironmentValidateResponse> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const validated = await validateEnvironment(connection, environmentId);
      if (validated.organizationId) {
        return validated;
      }
    } catch {
      // PATCH failed — auth likely not yet complete, continue polling
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(intervalMs);
  }

  throw new Error(
    `Authentication timed out after ${timeoutMs / 1000} seconds. Re-run the command or authenticate manually.`
  );
}

/**
 * Full orchestration: create environment -> poll for auth -> validate.
 * Returns the final result including organizationId.
 *
 * The caller is responsible for opening the browser at the returned redirectUrl
 * and displaying progress to the user. Use `onCreated` to receive the redirect URL
 * before polling begins.
 */
export async function addStageEnvironment(
  params: AddStageEnvironmentParams & {
    onCreated?: (data: { environmentId: string; redirectUrl: string }) => void;
    pollTimeoutMs?: number;
    pollIntervalMs?: number;
  }
): Promise<AddStageEnvironmentResult> {
  const { connection, pipelineId, stageId, environmentName, orgType, onCreated, pollTimeoutMs, pollIntervalMs } =
    params;

  const createData = await createEnvironment(connection, { pipelineId, stageId, environmentName, orgType });

  if (onCreated) {
    onCreated({ environmentId: createData.id, redirectUrl: createData.redirectUrl });
  }

  const validated = await pollForAuthentication(connection, createData.id, pollTimeoutMs, pollIntervalMs);

  return {
    success: true,
    stageId,
    environmentId: createData.id,
    environmentName: createData.name,
    orgType,
    pipelineId,
    redirectUrl: createData.redirectUrl,
    namedCredential: createData.namedCredential ?? validated.namedCredential,
    organizationId: validated.organizationId,
  };
}
