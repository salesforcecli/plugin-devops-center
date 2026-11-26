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

import { execCmd, TestSession, genUniqueString } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { createWorkItem, isDevopsCenterEnabled } from '../nutHelpers.js';
import type { CreatePullRequestResult } from '../../../../src/utils/createPullRequest.js';

describe('devops review create NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  // A work item that exists in the org but has no branch yet (freshly created)
  let noBranchWorkItemName: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      try {
        // Create a project and a bare work item (no VCS branch assigned yet)
        const projName = genUniqueString('NUT-review-%s');
        const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
          ensureExitCode: 0,
        });
        const projectId = proj.jsonOutput!.result.projectId;

        const subject = genUniqueString('NUT review item %s');
        noBranchWorkItemName = createWorkItem(projectId, subject, orgFlag).workItemName;
      } catch {
        // Fixture setup needs VCS authentication / DevOps Center data that the
        // target org may not have; skip the real-org tests instead of failing
        // the whole suite (which would also drop the flag-validation tests).
        dcEnabled = false;
      }
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops review create --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Create a pull request for a work item branch');
  });

  it('errors when --work-item-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops review create --work-item-id not-an-id', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid work-item-name supplied)', () => {
    const result = execCmd('devops review create --work-item-name WI-000001', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  // A work item without a DevOps Center branch assigned → command should error with NoBranch message
  it('errors with a NoBranch message for a work item with no branch', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<CreatePullRequestResult>(
      `devops review create --work-item-name ${noBranchWorkItemName} ${orgFlag}`,
      { ensureExitCode: 'nonZero' }
    );
    // The command errors before touching any VCS provider — no token required
    expect(result.shellOutput.stderr).to.include("doesn't have an associated branch");
  });
});
