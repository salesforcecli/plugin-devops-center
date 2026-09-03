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
import { GITHUB_REPO, STAGE_BRANCH, isDevopsCenterEnabled } from '../../nutHelpers.js';
import type { AddStageBranchResult } from '../../../../../src/utils/addStageBranch.js';
import type { CreatePipelineResult } from '../../../../../src/utils/createPipeline.js';

describe('devops stage branch add NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  // The last stage of the pipeline (no NextStageId) — branch setup must start right-to-left
  let lastStageId: string;
  let pipelineId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      try {
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
    const result = execCmd('devops stage branch add --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Add a source code repository branch to a pipeline stage');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops stage branch add', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('errors when --pipeline-id is an invalid Salesforce ID', () => {
    const result = execCmd(
      'devops stage branch add --pipeline-id not-an-id --stage-id 0XC000000000001AAA --branch-name main',
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('adds a branch to the last stage and returns structured JSON', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<AddStageBranchResult>(
      `devops stage branch add --pipeline-id ${pipelineId} --stage-id ${lastStageId} --branch-name ${STAGE_BRANCH} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.branchName).to.equal(STAGE_BRANCH);
    expect(output?.result.repoBranchId).to.match(/^[a-zA-Z0-9]{15,18}$/);
  });

  it('errors when --stage-id does not belong to the pipeline', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(
      `devops stage branch add --pipeline-id ${pipelineId} --stage-id 0XC000000000001AAA --branch-name main ${orgFlag}`,
      { ensureExitCode: 'nonZero' }
    );
    expect(result.shellOutput.stderr).to.include('0XC000000000001AAA');
  });
});
