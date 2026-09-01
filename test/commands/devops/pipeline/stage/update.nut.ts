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
import { isDevopsCenterEnabled } from '../../nutHelpers.js';
import type { PipelineStageUpdateResult } from '../../../../../src/commands/devops/pipeline/stage/update.js';

const GITHUB_REPO = 'https://github.com/salesforcecli/plugin-devops-center';

describe('devops pipeline stage update NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  let pipelineId: string;
  let stageId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      const name = genUniqueString('NUT-stage-upd-%s');
      const pipeline = execCmd<{ pipelineId: string }>(
        `devops pipeline create --name "${name}" --repo ${GITHUB_REPO} --repo-type github --json ${orgFlag}`,
        { ensureExitCode: 0 }
      );
      pipelineId = pipeline.jsonOutput!.result.pipelineId!;

      const stagesResult = execCmd<{ records: Array<{ Id: string }> }>(
        `data query --query "SELECT Id FROM DevopsPipelineStage WHERE DevopsPipelineId='${pipelineId}' ORDER BY CreatedDate ASC LIMIT 1" --json ${orgFlag}`,
        { ensureExitCode: 0, cli: 'sf' }
      );
      stageId = stagesResult.jsonOutput!.result.records[0].Id;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops pipeline stage update --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Update a DevOps Center pipeline stage');
  });

  it('errors when --stage-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops pipeline stage update --stage-id not-an-id --name NewName', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd('devops pipeline stage update --stage-id 1QV000000000001AAA --name NewName', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('updates a stage name and returns structured JSON', function () {
    if (!dcEnabled) this.skip();

    const newName = genUniqueString('NUT-stage-%s');
    const result = execCmd<PipelineStageUpdateResult>(
      `devops pipeline stage update --stage-id ${stageId} --name "${newName}" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.status).to.equal(0);
    expect(result.jsonOutput?.result.success).to.be.true;
    expect(result.jsonOutput?.result.stageId).to.equal(stageId);
    expect(result.jsonOutput?.result.name).to.equal(newName);
  });

  it('errors when the stage does not exist', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(`devops pipeline stage update --stage-id 1QV000000000001AAA --name Whatever ${orgFlag}`, {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr.toLowerCase()).to.include('stage');
  });
});
