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
import type { CreatePullRequestResult } from '../../../../src/utils/createPullRequest.js';

const REAL_ORG = [
  process.env.TESTKIT_HUB_USERNAME,
  process.env.TESTKIT_ORG_USERNAME,
  process.env.TESTKIT_AUTH_URL,
].some(Boolean);

describe('devops review create NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  // A work item that exists in the org but has no branch yet (freshly created)
  let noBranchWorkItemName: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    if (REAL_ORG) {
      // Create a project and a bare work item (no VCS branch assigned yet)
      const projName = genUniqueString('NUT-review-%s');
      const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
        ensureExitCode: 0,
      });
      const projectId = proj.jsonOutput!.result.projectId;

      const subject = genUniqueString('NUT review item %s');
      const wi = execCmd<{ workItemName: string }>(
        `devops work-item create --project-id ${projectId} --subject "${subject}" --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      noBranchWorkItemName = wi.jsonOutput!.result.workItemName;
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
  (REAL_ORG ? it : it.skip)('errors with a NoBranch message for a work item with no branch', () => {
    const result = execCmd<CreatePullRequestResult>(
      `devops review create --work-item-name ${noBranchWorkItemName} ${orgFlag}`,
      { ensureExitCode: 1 }
    );
    // The command errors before touching any VCS provider — no token required
    expect(result.shellOutput.stderr).to.match(/no branch|NoBranch/i);
  });
});
