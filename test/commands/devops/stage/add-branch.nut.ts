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
import type { AddStageBranchResult } from '../../../../src/utils/addStageBranch.js';
import type { CreatePipelineResult } from '../../../../src/utils/createPipeline.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops stage add-branch NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  // The last stage of the pipeline (no NextStageId) — branch setup must start right-to-left
  let lastStageId: string;
  let pipelineId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg.username ?? ''}`;

    if (REAL_ORG) {
      const name = genUniqueString('NUT-add-branch-%s');
      const pipeline = execCmd<CreatePipelineResult>(
        `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      pipelineId = pipeline.jsonOutput!.result.pipelineId!;

      // Query for the last stage (no NextStageId) — that's where branch setup must start
      const stagesResult = execCmd<{ records: Array<{ Id: string }> }>(
        `data query --query "SELECT Id FROM DevopsPipelineStage WHERE DevopsPipelineId='${pipelineId}' AND NextStageId=null LIMIT 1" --json ${orgFlag}`,
        { ensureExitCode: 0, cli: 'sf' }
      );
      lastStageId = stagesResult.jsonOutput!.result.records[0].Id;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops stage add-branch --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Add a source code repository branch to a pipeline stage');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops stage add-branch', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('errors when --pipeline-id is an invalid Salesforce ID', () => {
    const result = execCmd(
      'devops stage add-branch --pipeline-id not-an-id --stage-id 0XC000000000001AAA --branch-name main',
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('adds a branch to the last stage and returns structured JSON', () => {
    const result = execCmd<AddStageBranchResult>(
      `devops stage add-branch --pipeline-id ${pipelineId} --stage-id ${lastStageId} --branch-name main --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.branchName).to.equal('main');
    expect(output?.result.repoBranchId).to.match(/^[a-zA-Z0-9]{15,18}$/);
  });

  (REAL_ORG ? it : it.skip)('errors when --stage-id does not belong to the pipeline', () => {
    const result = execCmd(
      `devops stage add-branch --pipeline-id ${pipelineId} --stage-id 0XC000000000001AAA --branch-name main ${orgFlag}`,
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('0XC000000000001AAA');
  });
});
