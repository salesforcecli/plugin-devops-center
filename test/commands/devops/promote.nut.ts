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

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

const REAL_ORG = [
  process.env.TESTKIT_HUB_USERNAME,
  process.env.TESTKIT_ORG_USERNAME,
  process.env.TESTKIT_AUTH_URL,
].some(Boolean);

describe('devops promote NUTs', () => {
  let session: TestSession;
  let orgFlag: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops promote --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Promote work items or a pipeline stage');
  });

  it('errors when --target-stage-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops promote --target-stage-id not-an-id --stage-id 1QV000000000001AAA', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors with an invalid --test-level value', () => {
    const result = execCmd(
      'devops promote --target-stage-id 1QV000000000001AAA --stage-id 1QV000000000002AAA --test-level BogusLevel',
      { ensureExitCode: 2 }
    );
    expect(result.shellOutput.stderr).to.include('BogusLevel');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd('devops promote --target-stage-id 1QV000000000001AAA --stage-id 1QV000000000002AAA', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('errors when neither --work-item-id nor --stage-id is provided', () => {
    const result = execCmd(`devops promote --target-stage-id 1QV000000000001AAA ${orgFlag}`, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('--work-item-id');
  });
});
