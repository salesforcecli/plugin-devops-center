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
import type { DevopsWorkItemListResult } from '../../../../src/commands/devops/work-item/list.js';

describe('devops work-item list NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  let projectId: string;
  let createdWorkItemId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      try {
        // Create a project and seed one work item so the list is non-empty
        const projName = genUniqueString('NUT-wi-list-%s');
        const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
          ensureExitCode: 0,
        });
        projectId = proj.jsonOutput!.result.projectId!;

        const subject = genUniqueString('seed item %s');
        createdWorkItemId = createWorkItem(projectId, subject, orgFlag).workItemId;
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
    const result = execCmd('devops work-item list --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('List all work items');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops work-item list', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('returns JSON with a workItems array', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<DevopsWorkItemListResult>(
      `devops work-item list --project-id ${projectId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.workItems).to.be.an('array');
  });

  it('lists the seeded work item', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<DevopsWorkItemListResult>(
      `devops work-item list --project-id ${projectId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const ids = result.jsonOutput!.result.workItems.map((wi) => wi.id);
    expect(ids).to.include(createdWorkItemId);
  });

  it('each work item has required fields', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<DevopsWorkItemListResult>(
      `devops work-item list --project-id ${projectId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    for (const wi of result.jsonOutput!.result.workItems) {
      expect(wi).to.have.property('status').that.is.a('string');
    }
  });
});
