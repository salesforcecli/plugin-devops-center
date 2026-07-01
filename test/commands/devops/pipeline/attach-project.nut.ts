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

describe('devops pipeline attach-project NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
  });

  after(async () => {
    await session?.clean();
  });

  it('displays help text', () => {
    const result = execCmd('devops pipeline attach-project --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Attach a DevOps Center project to a pipeline');
  });

  it('errors when --target-org is missing', () => {
    // requiredOrg() resolves at parse time → NoDefaultEnvError → exit 1
    const result = execCmd('devops pipeline attach-project', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('errors when --target-org is missing (all IDs supplied)', () => {
    const result = execCmd(
      'devops pipeline attach-project --pipeline-id 0XB000000000001AAA --project-id 1Qg000000000001AAA',
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('target-org');
  });
});
