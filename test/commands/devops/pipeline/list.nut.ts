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
import type { PipelineListResult } from '../../../../src/utils/listPipelines.js';

describe('devops pipeline list NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  let pipelineId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      try {
        const name = genUniqueString('NUT-list-%s');
        const pipeline = execCmd<{ pipelineId: string }>(
          `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
          { ensureExitCode: 0 }
        );
        pipelineId = pipeline.jsonOutput!.result.pipelineId!;
      } catch {
        // Fixture setup needs VCS authentication / DevOps Center data that the
        // target org may not have; skip the real-org tests instead of failing
        // the whole suite (which would also drop the flag-validation tests).
        dcEnabled = false;
      }
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops pipeline list --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('List DevOps Center pipelines');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops pipeline list', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('returns JSON with a pipelines array', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<PipelineListResult>(`devops pipeline list --json ${orgFlag}`, { ensureExitCode: 0 });
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.pipelines).to.be.an('array');
  });

  it('includes the seeded pipeline', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<PipelineListResult>(`devops pipeline list --json ${orgFlag}`, { ensureExitCode: 0 });
    // list returns 18-char ids; the fixture holds the 15-char form — compare on the 15-char prefix
    const ids = (result.jsonOutput?.result.pipelines ?? []).map((p) => p.Id?.slice(0, 15));
    expect(ids).to.include(pipelineId);
  });
});
