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
import type { RequestStatusResult } from '../../../../src/utils/getRequestStatus.js';

describe('devops request status NUTs', () => {
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
    const result = execCmd('devops request status --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Get the status of a request');
  });

  it('errors when --target-org is missing (valid request-token supplied)', () => {
    const result = execCmd('devops request status --request-token some-token', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('errors when the request token does not exist', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<RequestStatusResult>(
      `devops request status --request-token NUT-nonexistent-token --json ${orgFlag}`,
      { ensureExitCode: 'nonZero' }
    );
    // With --json the error surfaces in the JSON payload's `message`, not stderr.
    expect(result.jsonOutput?.message?.toLowerCase()).to.include('not found');
  });
});
