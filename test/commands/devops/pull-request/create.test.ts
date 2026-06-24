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

describe('devops pull-request create', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CreateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const fetchDetailStub = sinon.stub();
  const createPrStub = sinon.stub();
  const resolveTokenStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/pull-request/create.js', {
      '../../../../src/utils/createPullRequest.js': {
        fetchWorkItemDetail: fetchDetailStub,
        createPullRequest: createPrStub,
        resolveGitHubToken: resolveTokenStub,
      },
    });
    CreateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchDetailStub.reset();
    createPrStub.reset();
    resolveTokenStub.reset();
    resolveTokenStub.resolves('ghp_test_token');
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
    repoOwner: 'myorg',
    repoName: 'myrepo',
    provider: 'github',
  };

  describe('successful creation by work-item-name', () => {
    test
      .stdout()
      .stderr()
      .it('creates PR and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.resolves(fullDetail);
        createPrStub.resolves({
          success: true,
          title: 'Fix login bug',
          url: 'https://github.com/myorg/myrepo/pull/42',
          sourceBranch: 'feature/WI-000001',
          targetBranch: 'integration',
        });

        await CreateCommand.run(['--target-org', 'testOrg', '--work-item-name', 'WI-000001']);

        expect(ctx.stdout).to.contain('Successfully created pull request for WI-000001');
        expect(ctx.stdout).to.contain('Title: Fix login bug');
        expect(ctx.stdout).to.contain('https://github.com/myorg/myrepo/pull/42');
        expect(ctx.stdout).to.contain('WI-000001 → integration');
      });
  });

  describe('successful creation by work-item-id with custom title', () => {
    test
      .stdout()
      .stderr()
      .it('creates PR using work item ID', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.resolves(fullDetail);
        createPrStub.resolves({
          success: true,
          title: 'Custom title',
          url: 'https://github.com/myorg/myrepo/pull/99',
          targetBranch: 'integration',
        });

        await CreateCommand.run([
          '--target-org',
          'testOrg',
          '--work-item-id',
          '0Wx000000000001',
          '--title',
          'Custom title',
          '--body',
          'Custom body',
        ]);

        expect(ctx.stdout).to.contain('Successfully created pull request');
        expect(ctx.stdout).to.contain('Custom title');
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

  describe('no VCS token available', () => {
    test
      .stdout()
      .stderr()
      .it('errors when no auth token is found', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchDetailStub.resolves(fullDetail);
        resolveTokenStub.resolves(undefined);

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--work-item-name', 'WI-000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('No authentication token found');
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
