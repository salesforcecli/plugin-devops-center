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

import { execCmd } from '@salesforce/cli-plugins-testkit';

/**
 * Real-org NUTs run only when the environment supplies org auth. CI sets these
 * vars to empty strings when no org is configured, so `.some(Boolean)` (not `??`)
 * is required — empty strings must be treated as "not set".
 */
export const REAL_ORG = [
  process.env.TESTKIT_HUB_USERNAME,
  process.env.TESTKIT_ORG_USERNAME,
  process.env.TESTKIT_AUTH_URL,
].some(Boolean);

/**
 * GitHub repo the pipeline/stage/branch fixtures connect a DevOps Center
 * pipeline to. The target org's DevOps Center must have a GitHub source
 * authorized against this repo for those real-org tests to run (otherwise the
 * server returns REPO_NOT_FOUND_OR_UNAUTHORIZED and the fixture guard skips
 * them). Override per-environment with DC_NUT_REPO; the default is a non-SSO
 * repo so CI isn't gated on SAML-protected org access.
 */
export const GITHUB_REPO = process.env.DC_NUT_REPO ?? 'https://github.com/ad-shreya/Solar';

/**
 * Branch that `stage branch add` associates with a pipeline stage. It must already
 * exist in GITHUB_REPO and must NOT be the repo's mainline (`main`): the server
 * reserves the mainline and rejects associating it to a stage ("Failed to create
 * Source Code Repository Branch"). A non-existent branch fails too ("Branch does
 * not exist"), so this must name a real, non-default branch. Override with
 * DC_NUT_STAGE_BRANCH when pointing at a different fixture repo.
 */
export const STAGE_BRANCH = process.env.DC_NUT_STAGE_BRANCH ?? 'staging';

/**
 * A target org may be authenticated but not have the DevOps Center feature
 * enabled (e.g. the shared CI dev hub). In that case every API-backed command
 * fails (FUNCTIONALITY_NOT_ENABLED, or "sObject type 'DevopsPipeline' is not
 * supported"). Probe once with a read-only command so real-org NUTs can skip
 * cleanly instead of failing the whole suite.
 *
 * Detection is by exit code, not error text, so it is robust to whichever error
 * a disabled org returns: `devops pipeline list` exits 0 only when the feature
 * is enabled (even with zero pipelines). Returns false when there is no real
 * org, so callers can gate both fixture setup and the real-org assertions on a
 * single flag.
 */
export const isDevopsCenterEnabled = (orgFlag: string): boolean => {
  if (!REAL_ORG) return false;
  const result = execCmd(`devops pipeline list --json ${orgFlag}`, { ensureExitCode: undefined });
  return result.jsonOutput?.status === 0;
};

export type SeededWorkItem = { workItemId: string; workItemName: string; subject: string };

/**
 * `work-item create` returns only `{ success, subject }` — no id or name. Fixtures
 * that need to update/review/promote a work item must read it back from
 * `work-item list` (which returns `{ id, name, subject, ... }`). Create the item,
 * then resolve its id and name by matching the unique subject.
 */
export const createWorkItem = (projectId: string, subject: string, orgFlag: string): SeededWorkItem => {
  execCmd(`devops work-item create --project-id ${projectId} --subject "${subject}" --json ${orgFlag}`, {
    ensureExitCode: 0,
  });
  const list = execCmd<{ workItems: Array<{ id: string; name: string; subject: string }> }>(
    `devops work-item list --project-id ${projectId} --json ${orgFlag}`,
    { ensureExitCode: 0 }
  );
  const wi = (list.jsonOutput?.result.workItems ?? []).find((w) => w.subject === subject);
  if (!wi) throw new Error(`Seeded work item '${subject}' not found in project ${projectId}`);
  return { workItemId: wi.id, workItemName: wi.name, subject: wi.subject };
};
