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
import type { AttachProjectResult } from '../../../../src/utils/attachProject.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops pipeline attach-project NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  let pipelineId: string;
  let projectId: string;
  // Second project to test the idempotency / double-attach error path
  let secondProjectId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    if (REAL_ORG) {
      const pipelineName = genUniqueString('NUT-attach-%s');
      const pipeline = execCmd<{ pipelineId: string }>(
        `devops pipeline create --name "${pipelineName}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      pipelineId = pipeline.jsonOutput!.result.pipelineId!;

      const projName = genUniqueString('NUT-attach-proj-%s');
      const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
        ensureExitCode: 0,
      });
      projectId = proj.jsonOutput!.result.projectId!;

      const projName2 = genUniqueString('NUT-attach-proj2-%s');
      const proj2 = execCmd<{ projectId: string }>(`devops project create --name "${projName2}" --json ${orgFlag}`, {
        ensureExitCode: 0,
      });
      secondProjectId = proj2.jsonOutput!.result.projectId!;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops pipeline attach-project --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Attach a DevOps Center project to a pipeline');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops pipeline attach-project', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('attaches a project to a pipeline and returns structured JSON', () => {
    const result = execCmd<AttachProjectResult>(
      `devops pipeline attach-project --pipeline-id ${pipelineId} --project-id ${projectId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.projectId).to.equal(projectId);
    expect(output?.result.pipelineId).to.equal(pipelineId);
  });

  (REAL_ORG ? it : it.skip)('errors when attaching the same project a second time', () => {
    // The first attachment was done in the previous test; re-attaching should fail
    const result = execCmd(
      `devops pipeline attach-project --pipeline-id ${pipelineId} --project-id ${projectId} ${orgFlag}`,
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('already attached');
  });

  (REAL_ORG ? it : it.skip)('attaches a second project to the same pipeline', () => {
    const result = execCmd<AttachProjectResult>(
      `devops pipeline attach-project --pipeline-id ${pipelineId} --project-id ${secondProjectId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.result.success).to.be.true;
    expect(result.jsonOutput?.result.projectId).to.equal(secondProjectId);
  });
});
