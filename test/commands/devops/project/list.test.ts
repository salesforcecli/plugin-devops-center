/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, test } from '@oclif/test';
import { TestContext } from '@salesforce/core/lib/testSetup';
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
