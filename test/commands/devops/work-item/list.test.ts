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
import { WorkItem } from '../../../../src/utils/types.js';

const MOCK_WORK_ITEM: WorkItem = {
  id: 'WI001',
  name: 'WI-001',
  subject: 'Fix bug',
  description: 'Details',
  status: 'In Progress',
  owner: 'USER001',
  DevopsProjectId: '1Qg000000000001',
  WorkItemBranch: 'feature/branch',
  TargetBranch: 'main',
};

describe('devops work-item list', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ListCommand: any;
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => ({ getApiVersion: () => '65.0' }) };
  const fetchWorkItemsStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/work-item/list.js', {
      '../../../../src/utils/workItems.js': {
        fetchWorkItems: fetchWorkItemsStub,
      },
    });
    ListCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchWorkItemsStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('lists work items', () => {
    test
      .stdout()
      .stderr()
      .it('displays work items in table', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchWorkItemsStub.resolves([MOCK_WORK_ITEM]);

        await ListCommand.run(['--target-org', 'testOrg', '--project-id', '1Qg000000000001']);

        expect(ctx.stdout).to.contain('WI-001');
      });
  });

  describe('no work items found', () => {
    test
      .stdout()
      .stderr()
      .it('logs message when no work items', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchWorkItemsStub.resolves([]);

        await ListCommand.run(['--target-org', 'testOrg', '--project-id', '1Qg000000000001']);

        expect(ctx.stdout).to.contain('No work items found');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchWorkItemsStub.rejects(new Error("sObject type 'WorkItem' is not supported"));

        try {
          await ListCommand.run(['--target-org', 'testOrg', '--project-id', '1Qg000000000001']);
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
        fetchWorkItemsStub.rejects(new Error('Network error'));

        try {
          await ListCommand.run(['--target-org', 'testOrg', '--project-id', '1Qg000000000001']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
