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

import { expect, test } from '@oclif/test';
import * as sinon from 'sinon';
import { Org } from '@salesforce/core';
import * as workItemsModule from '../../../../src/utils/workItems.js';
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
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => ({ getApiVersion: () => '65.0' }) };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('lists work items', () => {
    test
      .stdout()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(workItemsModule, 'fetchWorkItems').resolves([MOCK_WORK_ITEM]);
      })
      .command(['devops:work-item:list', '--target-org', 'testOrg', '--project-id', '1Qg000000000001'])
      .it('displays work items in table', (ctx) => {
        expect(ctx.stdout).to.contain('WI-001');
      });
  });

  describe('no work items found', () => {
    test
      .stdout()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(workItemsModule, 'fetchWorkItems').resolves([]);
      })
      .command(['devops:work-item:list', '--target-org', 'testOrg', '--project-id', '1Qg000000000001'])
      .it('logs message when no work items', (ctx) => {
        expect(ctx.stdout).to.contain('No work items found');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(workItemsModule, 'fetchWorkItems').rejects(new Error("sObject type 'WorkItem' is not supported"));
      })
      .command(['devops:work-item:list', '--target-org', 'testOrg', '--project-id', '1Qg000000000001'])
      .catch(() => {})
      .it('shows DevOps Center not enabled error', (ctx) => {
        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });
  });

  describe('rethrows other errors', () => {
    test
      .stdout()
      .stderr()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(workItemsModule, 'fetchWorkItems').rejects(new Error('Network error'));
      })
      .command(['devops:work-item:list', '--target-org', 'testOrg', '--project-id', '1Qg000000000001'])
      .catch((err) => {
        expect(err.message).to.contain('Network error');
      })
      .it('rethrows non-DevOps errors', () => {});
  });
});
