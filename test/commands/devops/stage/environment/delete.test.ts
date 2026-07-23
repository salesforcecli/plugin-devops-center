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

describe('devops stage environment delete', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DeleteCommand: any;
  const deleteStageEnvironmentStub = sinon.stub();

  const mockQueryStub = sinon.stub();
  const mockConnection = {
    getApiVersion: () => '65.0',
    query: mockQueryStub,
  };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/stage/environment/delete.js', {
      '../../../../../src/utils/deleteStageEnvironment.js': {
        deleteStageEnvironment: deleteStageEnvironmentStub,
      },
    });
    DeleteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    deleteStageEnvironmentStub.reset();
    mockQueryStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful deletion', () => {
    test
      .stdout()
      .stderr()
      .it('logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        deleteStageEnvironmentStub.resolves({ success: true, environmentId: '0Xe000000000001' });

        await DeleteCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0XB000000000001',
          '--environment-id',
          '0Xe000000000001',
        ]);

        expect(ctx.stdout).to.contain('Successfully deleted environment 0Xe000000000001');
      });
  });

  describe('pipeline already active', () => {
    test
      .stdout()
      .stderr()
      .it('shows active pipeline error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: true }] });

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--environment-id',
            '0Xe000000000001',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already active');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        deleteStageEnvironmentStub.rejects(new Error("sObject type 'DevopsEnvironment' is not supported"));
        mockQueryStub.resolves({ records: [{ IsActive: false }] });

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--environment-id',
            '0Xe000000000001',
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
      .it('rethrows non-DevOps errors from deleteStageEnvironment', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        deleteStageEnvironmentStub.rejects(new Error('Network error'));

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--environment-id',
            '0Xe000000000001',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
