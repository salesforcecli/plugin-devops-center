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
import type { AttachProjectResult } from '../../../../../src/utils/attachProject.js';

describe('devops pipeline project add NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  let pipelineId: string;
  let projectId: string;
  // Second project to test attaching another project to the same pipeline
  let secondProjectId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      try {
        const pipelineName = genUniqueString('NUT-projadd-%s');
        const pipeline = execCmd<{ pipelineId: string }>(
          `devops pipeline create --name "${pipelineName}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
          { ensureExitCode: 0 }
        );
        pipelineId = pipeline.jsonOutput!.result.pipelineId!;

        const projName = genUniqueString('NUT-projadd-proj-%s');
        const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
          ensureExitCode: 0,
        });
        projectId = proj.jsonOutput!.result.projectId!;

        const secondName = genUniqueString('NUT-projadd-proj2-%s');
        const proj2 = execCmd<{ projectId: string }>(`devops project create --name "${secondName}" --json ${orgFlag}`, {
          ensureExitCode: 0,
        });
        secondProjectId = proj2.jsonOutput!.result.projectId!;
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
    const result = execCmd('devops pipeline project add --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Attach a DevOps Center project to a pipeline');
  });

  it('errors when --pipeline-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops pipeline project add --pipeline-id not-an-id --project-id 0XC000000000001AAA', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd(
      'devops pipeline project add --pipeline-id 0XB000000000001AAA --project-id 0XC000000000001AAA',
      {
        ensureExitCode: 1,
      }
    );
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('attaches a project to a pipeline and returns structured JSON', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<AttachProjectResult>(
      `devops pipeline project add --pipeline-id ${pipelineId} --project-id ${projectId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.status).to.equal(0);
    expect(result.jsonOutput?.result.success).to.be.true;
  });

  it('errors when attaching the same project a second time', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(
      `devops pipeline project add --pipeline-id ${pipelineId} --project-id ${projectId} ${orgFlag}`,
      { ensureExitCode: 'nonZero' }
    );
    expect(result.shellOutput.stderr.toLowerCase()).to.include('already');
  });

  it('attaches a second project to the same pipeline', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<AttachProjectResult>(
      `devops pipeline project add --pipeline-id ${pipelineId} --project-id ${secondProjectId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.result.success).to.be.true;
  });
});
