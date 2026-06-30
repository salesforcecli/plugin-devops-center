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

describe('devops work-item prepare', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PrepareCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const prepareWorkItemStub = sinon.stub();
  const resolveProjectIdFromWorkItemStub = sinon.stub();
  const getPipelineIdForProjectStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/work-item/prepare.js', {
      '../../../../src/utils/prepareWorkItem.js': {
        prepareWorkItem: prepareWorkItemStub,
        resolveProjectIdFromWorkItem: resolveProjectIdFromWorkItemStub,
      },
      '../../../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: getPipelineIdForProjectStub,
      },
      '../../../../src/common/flags/flags.js': {
        requiredDoceOrgFlag: () => ({
          type: 'option' as const,
          char: 'c' as const,
          parse: async () => mockOrg,
          default: async () => mockOrg,
          required: true,
        }),
      },
    });
    PrepareCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    prepareWorkItemStub.reset();
    resolveProjectIdFromWorkItemStub.reset();
    getPipelineIdForProjectStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful preparation', () => {
    test
      .stdout()
      .stderr()
      .it('logs success message with request token', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdFromWorkItemStub.resolves('PROJ001');
        getPipelineIdForProjectStub.resolves('PIPE001');
        prepareWorkItemStub.resolves({
          success: true,
          requestToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          errorCode: null,
          errorMessage: null,
        });

        await PrepareCommand.run([
          '-c',
          'testOrg',
          '-i',
          '0Wx000000000001',
          '-s',
          '05S000000000001',
          '-t',
          '05S000000000002',
        ]);

        expect(ctx.stdout).to.contain('prepared for one-off promotion');
        expect(ctx.stdout).to.contain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      });
  });

  describe('failure response', () => {
    test
      .stdout()
      .stderr()
      .it('logs failure message with error code and message', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdFromWorkItemStub.resolves('PROJ001');
        getPipelineIdForProjectStub.resolves('PIPE001');
        prepareWorkItemStub.resolves({
          success: false,
          requestToken: null,
          errorCode: 'ALM_ERR_001',
          errorMessage: 'Source stage and target stage are not compatible for one-off promotion.',
        });

        await PrepareCommand.run([
          '-c',
          'testOrg',
          '-i',
          '0Wx000000000001',
          '-s',
          '05S000000000001',
          '-t',
          '05S000000000002',
        ]);

        expect(ctx.stdout).to.contain('Failed to prepare work item');
        expect(ctx.stdout).to.contain('ALM_ERR_001');
        expect(ctx.stdout).to.contain('not compatible for one-off promotion');
      });
  });

  describe('no pipeline found', () => {
    test
      .stdout()
      .stderr()
      .it('errors when no pipeline is associated with the project', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdFromWorkItemStub.resolves('PROJ001');
        getPipelineIdForProjectStub.resolves(undefined);

        try {
          await PrepareCommand.run([
            '-c',
            'testOrg',
            '-i',
            '0Wx000000000001',
            '-s',
            '05S000000000001',
            '-t',
            '05S000000000002',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('No pipeline found');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdFromWorkItemStub.rejects(new Error("sObject type 'WorkItem' is not supported"));

        try {
          await PrepareCommand.run([
            '-c',
            'testOrg',
            '-i',
            '0Wx000000000001',
            '-s',
            '05S000000000001',
            '-t',
            '05S000000000002',
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
      .it('rethrows non-DevOps errors from prepare call', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdFromWorkItemStub.resolves('PROJ001');
        getPipelineIdForProjectStub.resolves('PIPE001');
        prepareWorkItemStub.rejects(new Error('Network error'));

        try {
          await PrepareCommand.run([
            '-c',
            'testOrg',
            '-i',
            '0Wx000000000001',
            '-s',
            '05S000000000001',
            '-t',
            '05S000000000002',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
