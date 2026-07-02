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
import type { CreatePipelineResult } from '../../../../src/utils/createPipeline.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

// Use a real GitHub repo URL that DevOps Center can validate without creating anything
const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops pipeline create NUTs', () => {
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
    const result = execCmd('devops pipeline create --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Create a DevOps Center pipeline');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops pipeline create', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('rejects invalid --repo-type values', () => {
    const result = execCmd(`devops pipeline create --name MyPipeline --repo ${GITHUB_REPO} --repo-type notavalidtype`, {
      ensureExitCode: 2,
    });
    expect(result.shellOutput.stderr).to.include('notavalidtype');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('creates a pipeline and returns structured JSON', () => {
    const name = genUniqueString('NUT-pipeline-%s');
    const result = execCmd<CreatePipelineResult>(
      `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.pipelineId).to.match(/^[a-zA-Z0-9]{15,18}$/);
    expect(output?.result.name).to.equal(name);
    expect(output?.result.repository?.repoType).to.equal('github');
  });

  (REAL_ORG ? it : it.skip)('new pipeline starts in Inactive status', () => {
    const name = genUniqueString('NUT-pipeline-inactive-%s');
    const result = execCmd<CreatePipelineResult>(
      `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.result.status).to.equal('Inactive');
  });
});
