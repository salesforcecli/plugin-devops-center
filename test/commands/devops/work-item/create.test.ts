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

import esmock from 'esmock';
import { expect, test } from '@oclif/test';
import * as sinon from 'sinon';
import { Org } from '@salesforce/core';

describe('devops work-item create', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CreateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const createWorkItemStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/work-item/create.js', {
      '../../../../src/utils/createWorkItem.js': {
        createWorkItem: createWorkItemStub,
      },
    });
    CreateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    createWorkItemStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful creation', () => {
    test
      .stdout()
      .stderr()
      .it('logs success message', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createWorkItemStub.resolves({
          success: true,
          workItemId: 'WI001',
          workItemName: 'WI-001',
          subject: 'Fix bug',
        });

        await CreateCommand.run(['--target-org', 'testOrg', '--project-id', '1Qg000000000001', '--subject', 'Fix bug']);

        expect(ctx.stdout).to.contain('Successfully created work item');
      });
  });

  describe('successful creation with no workItemName', () => {
    test
      .stdout()
      .stderr()
      .it('falls back to workItemId in log', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createWorkItemStub.resolves({
          success: true,
          workItemId: 'WI001',
          subject: 'Fix bug',
        });

        await CreateCommand.run(['--target-org', 'testOrg', '--project-id', '1Qg000000000001', '--subject', 'Fix bug']);

        expect(ctx.stdout).to.contain('WI001');
      });
  });

  describe('creation failure', () => {
    test
      .stdout()
      .stderr()
      .it('shows failure error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createWorkItemStub.resolves({
          success: false,
          error: 'Not found',
        });

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--project-id',
            '1Qg000000000001',
            '--subject',
            'Fix bug',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to create work item');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createWorkItemStub.rejects(new Error("sObject type 'WorkItem' is not supported"));

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--project-id',
            '1Qg000000000001',
            '--subject',
            'Fix bug',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });
  });

  describe('rethrows other errors', () => {
    test
      .stdout()
      .stderr()
      .it('rethrows non-DevOps errors', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createWorkItemStub.rejects(new Error('Network error'));

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--project-id',
            '1Qg000000000001',
            '--subject',
            'Fix bug',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
