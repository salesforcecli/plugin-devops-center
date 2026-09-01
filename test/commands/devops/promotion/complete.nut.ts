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
import { isDevopsCenterEnabled } from '../nutHelpers.js';

describe('devops promotion complete NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops promotion complete --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Deploy undeployed work items to a pipeline stage org');
  });

  it('errors when --target-stage-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops promotion complete --target-stage-id not-an-id', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd('devops promotion complete --target-stage-id 1QV000000000001AAA', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('errors when the target stage does not exist', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(`devops promotion complete --target-stage-id 1QV000000000001AAA ${orgFlag}`, {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr.toLowerCase()).to.include('not found');
  });
});
