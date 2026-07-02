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
import type { CreateWorkItemResult } from '../../../../src/utils/createWorkItem.js';

const REAL_ORG = Boolean(process.env.TESTKIT_HUB_USERNAME ?? process.env.TESTKIT_ORG_USERNAME);

describe('devops work-item create NUTs', () => {
  let session: TestSession;
  let orgFlag: string;
  // Project created in before() to host work items
  let projectId: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'AUTO' });
    orgFlag = `--target-org ${session.hubOrg.username ?? ''}`;

    if (REAL_ORG) {
      const name = genUniqueString('NUT-wi-create-%s');
      const create = execCmd<{ projectId: string }>(`devops project create --name "${name}" --json ${orgFlag}`, {
        ensureExitCode: 0,
      });
      projectId = create.jsonOutput!.result.projectId!;
    }
  });

  after(async () => {
    await session?.clean();
  });

  // ── flag-validation tests ─────────────────────────────────────────────────

  it('displays help text', () => {
    const result = execCmd('devops work-item create --help', { ensureExitCode: 0 });
    expect(result.shellOutput.stdout).to.include('Create a new work item');
  });

  it('errors when --target-org is missing', () => {
    const result = execCmd('devops work-item create', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('target-org');
  });

  it('errors when --project-id prefix is wrong', () => {
    // salesforceId flag with startsWith:'1Qg' rejects IDs that start with something else
    const result = execCmd('devops work-item create --project-id 0XB000000000001AAA --subject Foo', {
      ensureExitCode: 1,
    });
    expect(result.shellOutput.stderr).to.include('1Qg');
  });

  // ── real-org tests ────────────────────────────────────────────────────────

  (REAL_ORG ? it : it.skip)('creates a work item and returns structured JSON', () => {
    const subject = genUniqueString('NUT work item %s');
    const result = execCmd<CreateWorkItemResult>(
      `devops work-item create --project-id ${projectId} --subject "${subject}" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    const output = result.jsonOutput;
    expect(output?.status).to.equal(0);
    expect(output?.result.success).to.be.true;
    expect(output?.result.workItemId).to.match(/^[a-zA-Z0-9]{15,18}$/);
    expect(output?.result.subject).to.equal(subject);
  });

  (REAL_ORG ? it : it.skip)('creates a work item with a description', () => {
    const subject = genUniqueString('NUT wi desc %s');
    const description = 'NUT description text';
    const result = execCmd<CreateWorkItemResult>(
      `devops work-item create --project-id ${projectId} --subject "${subject}" --description "${description}" --json ${orgFlag}`,
      { ensureExitCode: 0 }
    );
    // The workItemId proves the record was persisted; the API echoes subject back
    expect(result.jsonOutput?.result.workItemId).to.match(/^[a-zA-Z0-9]{15,18}$/);
  });
});
