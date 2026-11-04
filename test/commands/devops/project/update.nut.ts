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
import { isDevopsCenterEnabled } from '../nutHelpers.js';
import type { UpdateProjectResult } from '../../../../src/utils/updateProject.js';

describe('devops project update NUTs', () => {
  let session: TestSession;
  let dcEnabled = false;
  let orgFlag: string;
  let projectId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg?.username ?? ''}`;

    dcEnabled = isDevopsCenterEnabled(orgFlag);

    if (dcEnabled) {
      try {
        const projName = genUniqueString('NUT-proj-upd-%s');
        const proj = execCmd<{ projectId: string }>(`devops project create --name "${projName}" --json ${orgFlag}`, {
          ensureExitCode: 0,
        });
        projectId = proj.jsonOutput!.result.projectId!;
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
    const result = execCmd('devops project update --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Update a DevOps Center project');
  });

  it('errors when --project-id is an invalid Salesforce ID format', () => {
    const result = execCmd('devops project update --project-id not-an-id --name NewName', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('15 or 18 characters');
  });

  it('errors when --target-org is missing (valid flags supplied)', () => {
    const result = execCmd('devops project update --project-id 0XC000000000001AAA --name NewName', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  it('errors when no fields to update are provided', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd(`devops project update --project-id ${projectId} ${orgFlag}`, { ensureExitCode: 'nonZero' });
    expect(result.shellOutput.stderr).to.include('Provide at least one of');
  });

  it('updates the project name and returns structured JSON', function () {
    if (!dcEnabled) this.skip();

    const newName = genUniqueString('NUT-proj-renamed-%s');
    const result = execCmd<UpdateProjectResult>(
      `devops project update --project-id ${projectId} --name "${newName}" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.status).to.equal(0);
    expect(result.jsonOutput?.result.success).to.be.true;
    expect(result.jsonOutput?.result.name).to.equal(newName);
  });

  it('updates the project description and active flag', function () {
    if (!dcEnabled) this.skip();

    const result = execCmd<UpdateProjectResult>(
      `devops project update --project-id ${projectId} --description "NUT description" --no-is-active --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    expect(result.jsonOutput?.result.success).to.be.true;
    expect(result.jsonOutput?.result.description).to.equal('NUT description');
    expect(result.jsonOutput?.result.isActive).to.equal(false);
  });
});
