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
import { TestContext } from '@salesforce/core/testSetup';
import * as sinon from 'sinon';
import { Org } from '@salesforce/core';

describe('devops project list', () => {
  const $$ = new TestContext();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    $$.restore();
  });

  describe('returns projects', () => {
    test
      .stdout()
      .do(() => {
        const queryStub = sandbox.stub().resolves({
          records: [
            { Id: '001', Name: 'Project A', Description: 'Desc A' },
            { Id: '002', Name: 'Project B', Description: null },
          ],
        });
        const mockOrg = {
          id: '1',
          getOrgId: () => '1',
          getConnection: () => ({ query: queryStub, getApiVersion: () => '65.0' }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
      })
      .command(['devops:project:list', '--target-org', 'testOrg'])
      .it('lists projects when found', (ctx) => {
        expect(ctx.stdout).to.contain('Project A');
      });
  });

  describe('no projects found', () => {
    test
      .stdout()
      .do(() => {
        const queryStub = sandbox.stub().resolves({ records: [] });
        const mockOrg = {
          id: '1',
          getOrgId: () => '1',
          getConnection: () => ({ query: queryStub, getApiVersion: () => '65.0' }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
      })
      .command(['devops:project:list', '--target-org', 'testOrg'])
      .it('logs message when no projects', (ctx) => {
        expect(ctx.stdout).to.contain('No DevOps Center projects found');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .do(() => {
        const queryStub = sandbox.stub().rejects(new Error("sObject type 'DevopsProject' is not supported"));
        const mockOrg = {
          id: '1',
          getOrgId: () => '1',
          getConnection: () => ({ query: queryStub, getApiVersion: () => '65.0' }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
      })
      .command(['devops:project:list', '--target-org', 'testOrg'])
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
        const queryStub = sandbox.stub().rejects(new Error('Network error'));
        const mockOrg = {
          id: '1',
          getOrgId: () => '1',
          getConnection: () => ({ query: queryStub, getApiVersion: () => '65.0' }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
      })
      .command(['devops:project:list', '--target-org', 'testOrg'])
      .catch((err) => {
        expect(err.message).to.contain('Network error');
      })
      .it('rethrows non-DevOps errors', () => {});
  });
});
