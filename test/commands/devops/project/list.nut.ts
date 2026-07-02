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
import type { DevopsProjectListResult } from '../../../../src/commands/devops/project/list.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

describe('devops project list NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  let createdProjectId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    if (REAL_ORG) {
      // Seed a project so the list is guaranteed non-empty
      const name = genUniqueString('NUT-list-seed-%s');
      const create = execCmd<{ projectId: string }>(`devops project create --name "${name}" --json ${orgFlag}`, {
        ensureExitCode: 0,
      });
      createdProjectId = create.jsonOutput!.result.projectId!;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops project list --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('List all DevOps Center projects');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops project list', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('returns JSON with a projects array', () => {
    const result = execCmd<DevopsProjectListResult>(`devops project list --json ${orgFlag}`, {
      ensureExitCode: 0,
    });
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.projects).to.be.an('array');
  });

  (REAL_ORG ? it : it.skip)('lists the seeded project', () => {
    const result = execCmd<DevopsProjectListResult>(`devops project list --json ${orgFlag}`, {
      ensureExitCode: 0,
    });
    const ids = result.jsonOutput!.result.projects.map((p) => p.Id);
    expect(ids).to.include(createdProjectId);
  });

  (REAL_ORG ? it : it.skip)('each project record has Id and Name fields', () => {
    const result = execCmd<DevopsProjectListResult>(`devops project list --json ${orgFlag}`, {
      ensureExitCode: 0,
    });
    for (const project of result.jsonOutput!.result.projects) {
      expect(project.Id).to.match(/^[a-zA-Z0-9]{15,18}$/);
      expect(project.Name).to.be.a('string').and.not.empty;
    }
  });
});
