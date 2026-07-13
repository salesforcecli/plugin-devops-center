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
import type { CreateProjectResult } from '../../../../src/utils/createProject.js';

// These tests require a real org. Set TESTKIT_HUB_USERNAME (and TESTKIT_AUTH_URL or JWT vars)
// before running. CI sets these via secrets; locally use `sf org login web` and export the username.
const REAL_ORG = Boolean(
  process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME ?? process.env.TESTKIT_AUTH_URL
);

describe('devops project create NUTs', () => {
  let session: TestSession;
  let orgFlag: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests (no org required) ───────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops project create --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Create a DevOps Center project');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops project create', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('creates a project and returns structured JSON', () => {
    const name = genUniqueString('NUT-project-%s');
    const result = execCmd<CreateProjectResult>(`devops project create --name "${name}" --json ${orgFlag}`, {
      ensureExitCode: 0,
    });
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.projectId).to.match(/^[a-zA-Z0-9]{15,18}$/);
    expect(output?.result.name).to.equal(name);
  });

  (REAL_ORG ? it : it.skip)('creates a project with a description', () => {
    const name = genUniqueString('NUT-desc-%s');
    const desc = 'Created by NUT';
    const result = execCmd<CreateProjectResult>(
      `devops project create --name "${name}" --description "${desc}" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.result.description).to.equal(desc);
  });
});
