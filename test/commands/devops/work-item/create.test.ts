/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, test } from '@oclif/test';
import * as sinon from 'sinon';
import { Org } from '@salesforce/core';
import * as createWorkItemModule from '../../../../src/utils/createWorkItem';

describe('devops work-item create', () => {
  let sandbox: sinon.SinonSandbox;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful creation', () => {
    test
      .stdout()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(createWorkItemModule, 'createWorkItem').resolves({
          success: true,
          workItemId: 'WI001',
          workItemName: 'WI-001',
          subject: 'Fix bug',
        });
      })
      .command([
        'devops:work-item:create',
        '--target-org',
        'testOrg',
        '--project-id',
        'PROJ001',
        '--subject',
        'Fix bug',
      ])
      .it('logs success message', (ctx) => {
        expect(ctx.stdout).to.contain('Successfully created work item');
      });
  });

  describe('successful creation with no workItemName', () => {
    test
      .stdout()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(createWorkItemModule, 'createWorkItem').resolves({
          success: true,
          workItemId: 'WI001',
          subject: 'Fix bug',
        });
      })
      .command([
        'devops:work-item:create',
        '--target-org',
        'testOrg',
        '--project-id',
        'PROJ001',
        '--subject',
        'Fix bug',
      ])
      .it('falls back to workItemId in log', (ctx) => {
        expect(ctx.stdout).to.contain('WI001');
      });
  });

  describe('creation failure', () => {
    test
      .stdout()
      .stderr()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(createWorkItemModule, 'createWorkItem').resolves({
          success: false,
          error: 'Not found',
        });
      })
      .command([
        'devops:work-item:create',
        '--target-org',
        'testOrg',
        '--project-id',
        'PROJ001',
        '--subject',
        'Fix bug',
      ])
      .catch(() => {})
      .it('shows failure error', (ctx) => {
        expect(ctx.stderr).to.contain('Failed to create work item');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox
          .stub(createWorkItemModule, 'createWorkItem')
          .rejects(new Error("sObject type 'WorkItem' is not supported"));
      })
      .command([
        'devops:work-item:create',
        '--target-org',
        'testOrg',
        '--project-id',
        'PROJ001',
        '--subject',
        'Fix bug',
      ])
      .catch(() => {})
      .it('shows DevOps Center not enabled error', (ctx) => {
        expect(ctx.stderr).to.contain('DevOps Center is not enabled');
      });
  });

  describe('rethrows other errors', () => {
    test
      .stdout()
      .stderr()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        sandbox.stub(createWorkItemModule, 'createWorkItem').rejects(new Error('Network error'));
      })
      .command([
        'devops:work-item:create',
        '--target-org',
        'testOrg',
        '--project-id',
        'PROJ001',
        '--subject',
        'Fix bug',
      ])
      .catch((err) => {
        expect(err.message).to.contain('Network error');
      })
      .it('rethrows non-DevOps errors', () => {});
  });
});
