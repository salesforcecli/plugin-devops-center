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
import type { UpdateWorkItemStatusResult } from '../../../../../src/utils/updateWorkItemStatus.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

describe('devops work-item status update NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  let workItemName: string;
  let workItemId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg.username ?? ''}`;

    if (REAL_ORG) {
      // Create a project and a work item to update
      const projName = genUniqueString('NUT-wi-status-%s');
      const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
        ensureExitCode: 0,
      });
      const projectId = proj.jsonOutput?.result.projectId as string;

      const subject = genUniqueString('NUT status item %s');
      const wi = execCmd<{ workItemId: string; workItemName: string }>(
        `devops work-item create --project-id ${projectId} --subject "${subject}" --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      workItemId = wi.jsonOutput!.result.workItemId!;
      workItemName = wi.jsonOutput!.result.workItemName!;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops work-item status update --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Update the status of a work item');
  });

  it('errors with invalid --status value', () => {
    const result = execCmd('devops work-item status update --work-item-name WI-001 --status InvalidStatus', {
      ensureExitCode: 2,
    });
    expect(result.shellOutput.stderr).to.include('InvalidStatus');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd('devops work-item status update --work-item-name WI-001 --status "In Progress"', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('updates work item status by ID and returns structured JSON', () => {
    const result = execCmd<UpdateWorkItemStatusResult>(
      `devops work-item status update --work-item-id ${workItemId} --status "In Progress" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.workItemId).to.equal(workItemId);
    expect(output?.result.status).to.equal('In Progress');
  });

  (REAL_ORG ? it : it.skip)('updates work item status by name', () => {
    const result = execCmd<UpdateWorkItemStatusResult>(
      `devops work-item status update --work-item-name ${workItemName} --status "Ready to Promote" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.result.success).to.be.true;
    expect(result.jsonOutput?.result.status).to.equal('Ready to Promote');
  });
});
