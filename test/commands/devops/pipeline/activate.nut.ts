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
import type { ActivatePipelineResult } from '../../../../src/utils/activatePipeline.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops pipeline activate NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  // Pipeline created (with at least one stage) so activate can succeed
  let pipelineId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    if (REAL_ORG) {
      const name = genUniqueString('NUT-activate-%s');
      const pipeline = execCmd<{ pipelineId: string }>(
        `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      pipelineId = pipeline.jsonOutput!.result.pipelineId!;
      // pipeline create seeds default stages; no additional setup needed before activate
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops pipeline activate --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Activate a DevOps Center pipeline');
  });

  it('errors when --pipeline-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops pipeline activate --pipeline-id not-an-id', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid pipeline-id supplied)', () => {
    const result = execCmd('devops pipeline activate --pipeline-id 0XB000000000001AAA', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('activates a pipeline and returns structured JSON', () => {
    const result = execCmd<ActivatePipelineResult>(
      `devops pipeline activate --pipeline-id ${pipelineId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.pipelineId).to.equal(pipelineId);
    expect(output?.result.status).to.equal('Active');
  });

  (REAL_ORG ? it : it.skip)('errors when activating an already-active pipeline', () => {
    // Pipeline was activated in the previous test; re-activating should error
    const result = execCmd(`devops pipeline activate --pipeline-id ${pipelineId} ${orgFlag}`, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('already active');
  });
});
