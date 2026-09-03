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
import type { PipelineUpdateResult } from '../../../../src/utils/activatePipeline.js';

describe('devops pipeline update NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  // Pipeline created (with default stages) so activate/deactivate/rename can succeed
  let pipelineId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      try {
        const name = genUniqueString('NUT-update-%s');
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
    const result = execCmd('devops pipeline update --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Update a DevOps Center pipeline');
  });

  it('errors when --pipeline-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops pipeline update --pipeline-id not-an-id --activate', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd('devops pipeline update --pipeline-id 0XB000000000001AAA --activate', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  // A successful --activate cannot be tested headlessly: activation requires every
  // stage to have an associated environment, and associating an environment needs
  // interactive OAuth (browser + auth callback). We instead verify the command
  // reaches DevOps Center and enforces that precondition on a freshly created
  // pipeline whose default stages have no environments.
  it('errors when activating a pipeline whose stages have no environments', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(`devops pipeline update --pipeline-id ${pipelineId} --activate ${orgFlag}`, {
      ensureExitCode: 'nonZero',
    });
    expect(result.shellOutput.stderr).to.include('not associated to pipeline stages');
  });

  // The pipeline was never activated (see above), so it is still inactive — which
  // exercises the deactivate path's already-inactive guard. A successful deactivate
  // is unreachable headlessly for the same reason a successful activate is.
  it('errors when deactivating an already-inactive pipeline', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(`devops pipeline update --pipeline-id ${pipelineId} --deactivate ${orgFlag}`, {
      ensureExitCode: 'nonZero',
    });
    expect(result.shellOutput.stderr).to.include('already inactive');
  });

  it('renames the pipeline', function () {
    if (!dcEnabled) this.skip();

    const newName = genUniqueString('NUT-renamed-%s');
    const result = execCmd<PipelineUpdateResult>(
      `devops pipeline update --pipeline-id ${pipelineId} --name "${newName}" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.result.success).to.be.true;
    expect(result.jsonOutput?.result.name).to.equal(newName);
  });
});
