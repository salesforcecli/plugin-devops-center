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
import type { AddPipelineStageResult } from '../../../../../src/utils/addPipelineStage.js';
import type { CreatePipelineResult } from '../../../../../src/utils/createPipeline.js';

const REAL_ORG = Boolean(
  process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME ?? process.env.TESTKIT_AUTH_URL
);

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops pipeline stage add NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  let pipelineId: string;
  // One of the default stage IDs seeded by pipeline create, used as the `--next-stage-id`
  let existingStageId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    if (REAL_ORG) {
      const name = genUniqueString('NUT-stage-add-%s');
      const pipeline = execCmd<CreatePipelineResult>(
        `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      pipelineId = pipeline.jsonOutput!.result.pipelineId!;

      // Retrieve the first stage ID from the newly created pipeline via sf data query
      const stagesResult = execCmd<{ records: Array<{ Id: string }> }>(
        `data query --query "SELECT Id FROM DevopsPipelineStage WHERE DevopsPipelineId='${pipelineId}' ORDER BY CreatedDate ASC LIMIT 1" --json ${orgFlag}`,
        { ensureExitCode: 0, cli: 'sf' }
      );
      existingStageId = stagesResult.jsonOutput!.result.records[0].Id;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops pipeline stage add --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Add a stage to a DevOps Center pipeline');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops pipeline stage add', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('adds a stage before an existing stage and returns structured JSON', () => {
    const stageName = genUniqueString('NUT-stage-%s');
    const result = execCmd<AddPipelineStageResult>(
      `devops pipeline stage add --pipeline-id ${pipelineId} --name "${stageName}" --next-stage-id ${existingStageId} --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.stageId).to.match(/^[a-zA-Z0-9]{15,18}$/);
    expect(output?.result.name).to.equal(stageName);
    expect(output?.result.nextStageId).to.equal(existingStageId);
  });

  (REAL_ORG ? it : it.skip)('errors when --next-stage-id does not belong to the pipeline', () => {
    const result = execCmd(
      `devops pipeline stage add --pipeline-id ${pipelineId} --name NewStage --next-stage-id 0XC000000000001AAA ${orgFlag}`,
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('0XC000000000001AAA');
  });
});
