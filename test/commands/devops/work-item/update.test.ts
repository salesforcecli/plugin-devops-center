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
import sinon from 'sinon';
import { Org } from '@salesforce/core';

describe('devops work-item update', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let UpdateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const updateWorkItemStub = sinon.stub();
  const resolveWorkItemByNameStub = sinon.stub();
  const resolveProjectIdForWorkItemStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/work-item/update.js', {
      '../../../../src/utils/updateWorkItem.js': {
        updateWorkItem: updateWorkItemStub,
        resolveWorkItemByName: resolveWorkItemByNameStub,
        resolveProjectIdForWorkItem: resolveProjectIdForWorkItemStub,
        ALLOWED_STATUSES: ['In Progress', 'Ready to Promote'],
      },
    });
    UpdateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    updateWorkItemStub.reset();
    resolveWorkItemByNameStub.reset();
    resolveProjectIdForWorkItemStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('update status by ID', () => {
    test
      .stdout()
      .stderr()
      .it('updates status and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdForWorkItemStub.resolves('1Qg000000000001');
        updateWorkItemStub.resolves({ success: true, workItemId: '0Wx000000000001', status: 'In Progress' });

        await UpdateCommand.run([
          '--target-org',
          'testOrg',
          '--work-item-id',
          '0Wx000000000001',
          '--status',
          'In Progress',
        ]);

        expect(ctx.stdout).to.contain('Successfully updated work item 0Wx000000000001');
        expect(ctx.stdout).to.contain('In Progress');
        expect(updateWorkItemStub.calledWithMatch({ status: 'In Progress' })).to.be.true;
      });
  });

  describe('update subject by name', () => {
    test
      .stdout()
      .stderr()
      .it('updates subject and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveWorkItemByNameStub.resolves({ workItemId: '0Wx000000000001', projectId: '1Qg000000000001' });
        updateWorkItemStub.resolves({ success: true, workItemId: '0Wx000000000001', subject: 'Fix login bug' });

        await UpdateCommand.run([
          '--target-org',
          'testOrg',
          '--work-item-name',
          'WI-000001',
          '--subject',
          'Fix login bug',
        ]);

        expect(ctx.stdout).to.contain('Successfully updated work item WI-000001');
        expect(ctx.stdout).to.contain('Fix login bug');
        expect(updateWorkItemStub.calledWithMatch({ subject: 'Fix login bug' })).to.be.true;
      });
  });

  describe('update multiple fields', () => {
    test
      .stdout()
      .stderr()
      .it('passes all provided fields to the util', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveWorkItemByNameStub.resolves({ workItemId: '0Wx000000000001', projectId: '1Qg000000000001' });
        updateWorkItemStub.resolves({
          success: true,
          workItemId: '0Wx000000000001',
          subject: 'Fix login bug',
          description: 'Users cannot log in on mobile',
          status: 'In Progress',
        });

        await UpdateCommand.run([
          '--target-org',
          'testOrg',
          '--work-item-name',
          'WI-000001',
          '--subject',
          'Fix login bug',
          '--description',
          'Users cannot log in on mobile',
          '--status',
          'In Progress',
        ]);

        expect(ctx.stdout).to.contain('Fix login bug');
        expect(ctx.stdout).to.contain('Users cannot log in on mobile');
        expect(ctx.stdout).to.contain('In Progress');
        expect(
          updateWorkItemStub.calledWithMatch({
            subject: 'Fix login bug',
            description: 'Users cannot log in on mobile',
            status: 'In Progress',
          })
        ).to.be.true;
      });
  });

  describe('no fields provided', () => {
    test
      .stdout()
      .stderr()
      .it('errors when no update flags are given', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);

        try {
          await UpdateCommand.run(['--target-org', 'testOrg', '--work-item-id', '0Wx000000000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('at least one of --subject, --description, or --status');
        expect(updateWorkItemStub.called).to.be.false;
      });
  });

  describe('work item not found', () => {
    test
      .stdout()
      .stderr()
      .it('throws when name resolves no record', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveWorkItemByNameStub.rejects(new Error("Work item with name 'WI-999999' not found."));

        try {
          await UpdateCommand.run([
            '--target-org',
            'testOrg',
            '--work-item-name',
            'WI-999999',
            '--status',
            'In Progress',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('WI-999999');
        }
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdForWorkItemStub.resolves('1Qg000000000001');
        updateWorkItemStub.rejects(new Error("sObject type 'WorkItem' is not supported"));

        try {
          await UpdateCommand.run([
            '--target-org',
            'testOrg',
            '--work-item-id',
            '0Wx000000000001',
            '--status',
            'In Progress',
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
        resolveProjectIdForWorkItemStub.resolves('1Qg000000000001');
        updateWorkItemStub.rejects(new Error('Network error'));

        try {
          await UpdateCommand.run([
            '--target-org',
            'testOrg',
            '--work-item-id',
            '0Wx000000000001',
            '--status',
            'In Progress',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
