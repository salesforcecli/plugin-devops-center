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

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

describe('devops pull-request create NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  // A work item that exists in the org but has no branch yet (freshly created)
  let noBranchWorkItemName: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg.username ?? ''}`;

    if (REAL_ORG) {
      // Create a project and a bare work item (no VCS branch assigned yet)
      const projName = genUniqueString('NUT-pr-%s');
      const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
        ensureExitCode: 0,
      });
      const projectId = proj.jsonOutput?.result.projectId as string;

      const subject = genUniqueString('NUT PR item %s');
      const wi = execCmd<{ workItemName: string }>(
        `devops work-item create --project-id ${projectId} --subject "${subject}" --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      noBranchWorkItemName = wi.jsonOutput!.result.workItemName!;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops pull-request create --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Create a pull request');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops pull-request create --work-item-name WI-001', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('errors when neither --work-item-name nor --work-item-id is supplied', () => {
    // exactlyOne constraint fires before org resolution → exit 2
    const result = execCmd('devops pull-request create', { ensureExitCode: 2 });
    expect(result.shellOutput.stderr).to.match(/work-item-name|work-item-id/);
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  // A work item without a DevOps Center branch assigned → command should error with NoBranch message
  (REAL_ORG ? it : it.skip)('errors with NoBranch message for a work item with no branch', () => {
    const result = execCmd(`devops pull-request create --work-item-name ${noBranchWorkItemName} ${orgFlag}`, {
      ensureExitCode: 1,
    });
    // The command errors before touching any VCS provider — no token required
    expect(result.shellOutput.stderr).to.match(/no branch|NoBranch/i);
  });
});
