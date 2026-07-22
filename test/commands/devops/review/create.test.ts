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

describe('devops review create', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CreateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const fetchDetailStub = sinon.stub();
  const createPrStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/review/create.js', {
      '../../../../src/utils/createPullRequest.js': {
        fetchWorkItemDetail: fetchDetailStub,
        createPullRequest: createPrStub,
      },
    });
    CreateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchDetailStub.reset();
    createPrStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const fullDetail = {
    workItemId: '0Wx000000000001',
    workItemName: 'WI-000001',
    subject: 'Fix login bug',
    branchName: 'feature/WI-000001',
    targetBranch: 'integration',
    projectId: '1Qg000000000001',
    provider: 'github',
  };

  describe('successful creation by work-item-name', () => {
    test
      .stdout()
      .stderr()
      .it('creates PR via Connect API and logs success with URL', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.resolves(fullDetail);
        createPrStub.resolves({
          success: true,
          url: 'https://github.com/myorg/myrepo/pull/42',
        });

        await CreateCommand.run(['--target-org', 'testOrg', '--work-item-name', 'WI-000001']);

        expect(ctx.stdout).to.contain('Successfully created pull request for WI-000001');
        expect(ctx.stdout).to.contain('https://github.com/myorg/myrepo/pull/42');
        expect(ctx.stdout).to.contain('feature/WI-000001 → integration');
        expect(createPrStub.calledWithMatch(mockConnection, '0Wx000000000001')).to.be.true;
      });
  });

  describe('successful creation by work-item-id', () => {
    test
      .stdout()
      .stderr()
      .it('creates PR using work item ID', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.resolves(fullDetail);
        createPrStub.resolves({ success: true, url: 'https://github.com/myorg/myrepo/pull/99' });

        await CreateCommand.run(['--target-org', 'testOrg', '--work-item-id', '0Wx000000000001']);

        expect(ctx.stdout).to.contain('Successfully created pull request for WI-000001');
      });
  });

  describe('work item has no branch', () => {
    test
      .stdout()
      .stderr()
      .it('errors when work item has no associated branch', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.resolves({ ...fullDetail, branchName: undefined });

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--work-item-name', 'WI-000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("doesn't have an associated branch");
      });
  });

  describe('Connect API returns no-changes error', () => {
    test
      .stdout()
      .stderr()
      .it('surfaces a clean error message', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.resolves(fullDetail);
        createPrStub.rejects(
          new Error('The branch has no commits ahead of the target branch. Push your changes and try again.')
        );

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--work-item-name', 'WI-000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Push your changes and try again');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.rejects(new Error("sObject type 'WorkItem' is not supported"));

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--work-item-name', 'WI-000001']);
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
        fetchDetailStub.rejects(new Error('Network error'));

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--work-item-name', 'WI-000001']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
