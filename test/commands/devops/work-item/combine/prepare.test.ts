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

describe('devops work-item combine prepare', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PrepareCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = {
    id: '1',
    getOrgId: () => '1',
    getConnection: () => mockConnection,
    getUsername: () => 'my-devops-org',
  };
  const combineWorkItemsPrepareStub = sinon.stub();
  const getPipelineIdForProjectStub = sinon.stub();
  const resolveProjectIdFromWorkItemStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/work-item/combine/prepare.js', {
      '../../../../../src/utils/combineWorkItems.js': {
        combineWorkItemsPrepare: combineWorkItemsPrepareStub,
      },
      '../../../../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: getPipelineIdForProjectStub,
      },
      '../../../../../src/utils/prepareWorkItem.js': {
        resolveProjectIdFromWorkItem: resolveProjectIdFromWorkItemStub,
      },
    });
    PrepareCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    combineWorkItemsPrepareStub.reset();
    getPipelineIdForProjectStub.reset();
    resolveProjectIdFromWorkItemStub.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(mockOrg);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful combine prepare', () => {
    test
      .stdout()
      .stderr()
      .it('prepares work items and prints success output', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: '1Qg000000000001', pipelineStageId: '05S000000000001' });
        getPipelineIdForProjectStub.resolves('0Xo000000000001');
        combineWorkItemsPrepareStub.resolves({
          success: true,
          requestToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          errorCode: null,
          errorMessage: null,
        });

        await PrepareCommand.run([
          '-o',
          'my-devops-org',
          '--parent-work-item-id',
          '0Wx000000000001',
          '--child-work-item-id',
          '0Wx000000000002',
          '--child-work-item-id',
          '0Wx000000000003',
          '-t',
          '05S000000000002',
        ]);

        expect(ctx.stdout).to.contain('Work items prepared for custom promotion.');
        expect(ctx.stdout).to.contain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
        expect(ctx.stdout).to.contain('sf devops work-item promote');

        const callArgs = combineWorkItemsPrepareStub.firstCall.args[0];
        expect(callArgs.sourceStageId).to.equal('05S000000000001');
        expect(callArgs.targetStageId).to.equal('05S000000000002');
      });
  });

  describe('failed combine prepare', () => {
    test
      .stdout()
      .stderr()
      .it('prints error details on failure', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: '1Qg000000000001', pipelineStageId: '05S000000000001' });
        getPipelineIdForProjectStub.resolves('0Xo000000000001');
        combineWorkItemsPrepareStub.resolves({
          success: false,
          requestToken: null,
          errorCode: 'ALM_ERR_002',
          errorMessage: 'One or more work items have conflicting components.',
        });

        await PrepareCommand.run([
          '-o',
          'my-devops-org',
          '--parent-work-item-id',
          '0Wx000000000001',
          '--child-work-item-id',
          '0Wx000000000002',
          '-t',
          '05S000000000002',
        ]);

        expect(ctx.stdout).to.contain('Failed to prepare work items for custom promotion.');
        expect(ctx.stdout).to.contain('ALM_ERR_002');
        expect(ctx.stdout).to.contain('conflicting components');
      });
  });

  describe('no pipeline found', () => {
    test
      .stdout()
      .stderr()
      .it('errors when no pipeline is found for the project', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: '1Qg000000000001', pipelineStageId: '05S000000000001' });
        getPipelineIdForProjectStub.resolves(undefined);

        try {
          await PrepareCommand.run([
            '-o',
            'my-devops-org',
            '--parent-work-item-id',
            '0Wx000000000001',
            '--child-work-item-id',
            '0Wx000000000002',
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
      .it('shows DevOps Center not enabled error from resolveProjectId', async (ctx) => {
        resolveProjectIdFromWorkItemStub.rejects(new Error("sObject type 'WorkItem' is not supported"));

        try {
          await PrepareCommand.run([
            '-o',
            'my-devops-org',
            '--parent-work-item-id',
            '0Wx000000000001',
            '--child-work-item-id',
            '0Wx000000000002',
            '-t',
            '05S000000000002',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });

    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error from combineWorkItemsPrepare', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: '1Qg000000000001', pipelineStageId: '05S000000000001' });
        getPipelineIdForProjectStub.resolves('0Xo000000000001');
        combineWorkItemsPrepareStub.rejects(new Error("sObject type 'WorkItem' is not supported"));

        try {
          await PrepareCommand.run([
            '-o',
            'my-devops-org',
            '--parent-work-item-id',
            '0Wx000000000001',
            '--child-work-item-id',
            '0Wx000000000002',
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
      .it('rethrows non-DevOps errors from combineWorkItemsPrepare', async () => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: '1Qg000000000001', pipelineStageId: '05S000000000001' });
        getPipelineIdForProjectStub.resolves('0Xo000000000001');
        combineWorkItemsPrepareStub.rejects(new Error('Network error'));

        try {
          await PrepareCommand.run([
            '-o',
            'my-devops-org',
            '--parent-work-item-id',
            '0Wx000000000001',
            '--child-work-item-id',
            '0Wx000000000002',
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
