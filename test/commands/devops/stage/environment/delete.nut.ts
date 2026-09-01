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

const REAL_ORG = [
  process.env.TESTKIT_HUB_USERNAME,
  process.env.TESTKIT_ORG_USERNAME,
  process.env.TESTKIT_AUTH_URL,
].some(Boolean);

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops stage environment delete NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  let pipelineId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    if (REAL_ORG) {
      const name = genUniqueString('NUT-env-del-%s');
      const pipeline = execCmd<{ pipelineId: string }>(
        `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      pipelineId = pipeline.jsonOutput!.result.pipelineId!;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops stage environment delete --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Delete an environment from a DevOps Center pipeline stage');
  });

  it('errors when --pipeline-id is an invalid Salesforce ID format', () => {
    const result = execCmd(
      'devops stage environment delete --pipeline-id not-an-id --environment-id 0Xk000000000001AAA',
      {
        ensureExitCode: 1,
      }
    );
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd(
      'devops stage environment delete --pipeline-id 0XB000000000001AAA --environment-id 0Xk000000000001AAA',
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('errors when the environment does not exist', () => {
    const result = execCmd(
      `devops stage environment delete --pipeline-id ${pipelineId} --environment-id 0Xk000000000001AAA ${orgFlag}`,
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.not.equal('');
  });
});
