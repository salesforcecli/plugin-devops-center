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
