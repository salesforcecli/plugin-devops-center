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
import { isDevopsCenterEnabled } from '../nutHelpers.js';
import type { PipelineGetResult } from '../../../../src/utils/getPipeline.js';

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops pipeline get NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  let pipelineId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      const name = genUniqueString('NUT-get-%s');
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
    const result = execCmd('devops pipeline get --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Get details of a DevOps Center pipeline');
  });

  it('errors when --pipeline-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops pipeline get --pipeline-id not-an-id', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid pipeline-id supplied)', () => {
    const result = execCmd('devops pipeline get --pipeline-id 0XB000000000001AAA', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('returns structured JSON for an existing pipeline', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<PipelineGetResult>(`devops pipeline get --pipeline-id ${pipelineId} --json ${orgFlag}`, {
      ensureExitCode: 0,
    });
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.id).to.equal(pipelineId);
    expect(output?.result.name).to.be.a('string');
    expect(output?.result.isActive).to.equal(false);
    expect(output?.result.stages).to.be.an('array');
    expect(output?.result.connectedProjects).to.be.an('array');
  });

  it('errors when the pipeline does not exist', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(`devops pipeline get --pipeline-id 0XB000000000001AAA ${orgFlag}`, { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('not found');
  });
});
