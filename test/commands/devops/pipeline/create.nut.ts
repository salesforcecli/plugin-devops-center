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
import { GITHUB_REPO, isDevopsCenterEnabled } from '../nutHelpers.js';
import type { CreatePipelineResult } from '../../../../src/utils/createPipeline.js';

describe('devops pipeline create NUTs', () => {
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

  it('creates a pipeline and returns structured JSON', function () {
    if (!dcEnabled) this.skip();

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

  it('new pipeline starts in Inactive status', function () {
    if (!dcEnabled) this.skip();

    const name = genUniqueString('NUT-pipeline-inactive-%s');
    const result = execCmd<CreatePipelineResult>(
      `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const pipelineId = result.jsonOutput!.result.pipelineId!;
    // The create response `status` is the operation result ('SUCCESS'); a new pipeline's
    // inactive state is exposed via `pipeline get` → isActive: false.
    const get = execCmd<{ isActive: boolean }>(`devops pipeline get --pipeline-id ${pipelineId} --json ${orgFlag}`, {
      ensureExitCode: 0,
    });
    expect(get.jsonOutput?.result.isActive).to.equal(false);
  });
});
