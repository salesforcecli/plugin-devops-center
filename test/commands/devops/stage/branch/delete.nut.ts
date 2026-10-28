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
import { GITHUB_REPO, isDevopsCenterEnabled } from '../../nutHelpers.js';

describe('devops stage branch delete NUTs', () => {
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
        const name = genUniqueString('NUT-branch-del-%s');
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
    const result = execCmd('devops stage branch delete --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include(
      'Delete the source code repository branch associated with a pipeline stage'
    );
  });

  it('errors when --pipeline-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops stage branch delete --pipeline-id not-an-id --stage-id 1QV000000000001AAA', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd(
      'devops stage branch delete --pipeline-id 0XB000000000001AAA --stage-id 1QV000000000001AAA',
      {
        ensureExitCode: 1,
      }
    );
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('errors when the stage does not belong to the pipeline', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(
      `devops stage branch delete --pipeline-id ${pipelineId} --stage-id 1QV000000000001AAA ${orgFlag}`,
      { ensureExitCode: 'nonZero' }
    );
    expect(result.shellOutput.stderr.toLowerCase()).to.include('stage');
  });
});
