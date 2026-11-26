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
import type { CreatePipelineResult } from '../../../../../src/utils/createPipeline.js';

describe('devops stage environment add NUTs', () => {
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
        const name = genUniqueString('NUT-add-env-%s');
        const pipeline = execCmd<CreatePipelineResult>(
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
    const result = execCmd('devops stage environment add --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Add a Salesforce environment to a pipeline stage');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops stage environment add', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('rejects invalid --org-type values', () => {
    const result = execCmd(
      'devops stage environment add --pipeline-id 0XB000000000001AAA --stage-id 0XC000000000001AAA --environment-name myEnv --org-type NotValid',
      { ensureExitCode: 2 }
    );
    expect(result.shellOutput.stderr).to.include('NotValid');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  // The full happy path requires interactive OAuth (browser open + org auth callback),
  // which cannot run headlessly — with a valid stage the command prints an auth URL and
  // blocks indefinitely on "Waiting for authentication to complete..." until a callback
  // that never arrives. We therefore verify only that the command reaches the API layer,
  // by supplying a non-existent stage ID so it errors before the OAuth step.
  it('errors when --stage-id does not belong to the pipeline', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(
      `devops stage environment add --pipeline-id ${pipelineId} --stage-id 0XC000000000001AAA --environment-name myEnv --org-type Sandbox --no-browser ${orgFlag}`,
      { ensureExitCode: 'nonZero' }
    );
    expect(result.shellOutput.stderr).to.include('0XC000000000001AAA');
  });
});
