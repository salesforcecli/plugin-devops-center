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

describe('devops work-item status update NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
  });

  after(async () => {
    await session?.clean();
  });

  it('displays help text', () => {
    const result = execCmd('devops work-item status update --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Update the status of a work item');
  });

  it('errors with invalid --status value', () => {
    // oclif validates options list before org resolution → exit 2
    const result = execCmd('devops work-item status update --work-item-name WI-001 --status InvalidStatus', {
      ensureExitCode: 2,
    });
    expect(result.shellOutput.stderr).to.include('InvalidStatus');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    // requiredOrg() resolves at parse time → NoDefaultEnvError → exit 1
    // Use a shell-quoted multi-word status value
    const result = execCmd("devops work-item status update --work-item-name WI-001 --status 'In Progress'", {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('target-org');
  });
});
