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

describe('devops request status', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let StatusCommand: any;
  const getRequestStatusStub = sinon.stub();
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/request/status.js', {
      '../../../../src/utils/getRequestStatus.js': {
        getRequestStatus: getRequestStatusStub,
      },
    });
    StatusCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    getRequestStatusStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('completed request', () => {
    test
      .stdout()
      .stderr()
      .it('displays all fields', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getRequestStatusStub.resolves({
          id: '0Bf000000000001',
          status: 'Completed',
          message: 'Promotion completed successfully',
          errorDetails: null,
          requestToken: 'a0B000000000001',
          requestCompletionDate: '2026-07-17T10:00:00.000Z',
        });

        await StatusCommand.run(['--target-org', 'testOrg', '--request-token', 'a0B000000000001']);

        expect(ctx.stdout).to.contain('a0B000000000001');
        expect(ctx.stdout).to.contain('0Bf000000000001');
        expect(ctx.stdout).to.contain('Promotion completed successfully');
        expect(ctx.stdout).to.contain('2026-07-17T10:00:00.000Z');
      });
  });

  describe('failed request', () => {
    test
      .stdout()
      .stderr()
      .it('displays error details', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getRequestStatusStub.resolves({
          id: '0Bf000000000002',
          status: 'Error',
          message: 'Deployment failed',
          errorDetails: 'ApexClass MyClass has compile errors',
          requestToken: 'a0B000000000002',
          requestCompletionDate: null,
        });

        await StatusCommand.run(['--target-org', 'testOrg', '--request-token', 'a0B000000000002']);

        expect(ctx.stdout).to.contain('Error');
        expect(ctx.stdout).to.contain('ApexClass MyClass has compile errors');
      });
  });

  describe('request not found', () => {
    test
      .stdout()
      .stderr()
      .it('shows request not found error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getRequestStatusStub.rejects(new Error('RequestNotFound:a0B000000000099'));

        try {
          await StatusCommand.run(['--target-org', 'testOrg', '--request-token', 'a0B000000000099']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('not found');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getRequestStatusStub.rejects(new Error("sObject type 'DevopsRequestInfo' is not supported"));

        try {
          await StatusCommand.run(['--target-org', 'testOrg', '--request-token', 'a0B000000000001']);
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
        getRequestStatusStub.rejects(new Error('Network error'));

        try {
          await StatusCommand.run(['--target-org', 'testOrg', '--request-token', 'a0B000000000001']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
