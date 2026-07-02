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
import type { CreatePipelineResult } from '../../../../src/utils/createPipeline.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops stage add-environment NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  let pipelineId: string;
  let validStageId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    if (REAL_ORG) {
      const name = genUniqueString('NUT-add-env-%s');
      const pipeline = execCmd<CreatePipelineResult>(
        `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      pipelineId = pipeline.jsonOutput!.result.pipelineId!;

      const stagesResult = execCmd<{ records: Array<{ Id: string }> }>(
        `data query --query "SELECT Id FROM DevopsPipelineStage WHERE DevopsPipelineId='${pipelineId}' LIMIT 1" --json ${orgFlag}`,
        { ensureExitCode: 0, cli: 'sf' }
      );
      validStageId = stagesResult.jsonOutput!.result.records[0].Id;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops stage add-environment --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Add a Salesforce environment to a pipeline stage');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops stage add-environment', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('rejects invalid --org-type values', () => {
    const result = execCmd(
      'devops stage add-environment --pipeline-id 0XB000000000001AAA --stage-id 0XC000000000001AAA --environment-name myEnv --org-type NotValid',
      { ensureExitCode: 2 }
    );
    expect(result.shellOutput.stderr).to.include('NotValid');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  // The full happy path requires interactive OAuth (browser open + org auth callback),
  // which cannot run headlessly. We verify the command reaches the API layer by
  // checking the error when a non-existent stage ID is supplied.
  (REAL_ORG ? it : it.skip)('errors when --stage-id does not belong to the pipeline', () => {
    const result = execCmd(
      `devops stage add-environment --pipeline-id ${pipelineId} --stage-id 0XC000000000001AAA --environment-name myEnv --org-type Sandbox --no-browser ${orgFlag}`,
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.include('0XC000000000001AAA');
  });

  (REAL_ORG ? it : it.skip)('errors with valid stage when no org auth is completed (timeout)', () => {
    // With --no-browser the command waits for auth but no callback arrives → auth timeout error.
    // We use a very short wait by setting the async flag; if the command has no --async,
    // the timeout comes from the server side after the OAuth session expires.
    // This confirms the command reaches DevOps Center and attempts the environment-creation flow.
    const result = execCmd(
      `devops stage add-environment --pipeline-id ${pipelineId} --stage-id ${validStageId} --environment-name NUT-env --org-type Sandbox --no-browser ${orgFlag}`,
      { ensureExitCode: 1 }
    );
    expect(result.shellOutput.stderr).to.match(/timed out|auth|AuthTimeout/i);
  });
});
