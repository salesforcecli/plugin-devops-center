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

/* eslint-disable camelcase */
import esmock from 'esmock';
import { expect, test } from '@oclif/test';
import sinon from 'sinon';
import { Org } from '@salesforce/core';

describe('devops work-item promote', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PromoteCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const promoteStageStub = sinon.stub();
  const resolveProjectIdFromWorkItemStub = sinon.stub();
  const getPipelineIdForProjectStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/work-item/promote.js', {
      '../../../../src/utils/promoteStage.js': {
        promoteStage: promoteStageStub,
      },
      '../../../../src/utils/prepareWorkItem.js': {
        resolveProjectIdFromWorkItem: resolveProjectIdFromWorkItemStub,
      },
      '../../../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: getPipelineIdForProjectStub,
      },
      '@salesforce/sf-plugins-core': {
        ...(await import('@salesforce/sf-plugins-core')),
        Flags: {
          ...(await import('@salesforce/sf-plugins-core')).Flags,
          requiredOrg: () => ({
            type: 'option' as const,
            char: 'o' as const,
            parse: async () => mockOrg,
            default: async () => mockOrg,
            required: true,
          }),
          orgApiVersion: () => ({
            type: 'option' as const,
            parse: async () => '65.0',
            required: false,
          }),
        },
      },
    });
    PromoteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    promoteStageStub.reset();
    resolveProjectIdFromWorkItemStub.reset();
    getPipelineIdForProjectStub.reset();
    resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
    getPipelineIdForProjectStub.resolves('PIPE001');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful promotion', () => {
    test
      .stdout()
      .stderr()
      .it('promotes a single work item and displays output', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        promoteStageStub.resolves({
          requestId: 'mock-request-id',
          status: 'SUBMITTED',
          message: 'Work items successfully promoted to UAT.',
          promotedWorkitemIds: ['0Wx000000000001'],
        });

        await PromoteCommand.run(['-o', 'testOrg', '-i', '0Wx000000000001', '-t', '05S000000000002']);

        expect(ctx.stdout).to.contain('SUBMITTED');
        expect(ctx.stdout).to.contain('0Wx000000000001');
        expect(promoteStageStub.calledOnce).to.be.true;
        const callArgs = promoteStageStub.firstCall.args[0];
        expect(callArgs.pipelineId).to.equal('PIPE001');
        expect(callArgs.workItemIds).to.deep.equal(['0Wx000000000001']);
        expect(callArgs.targetStageId).to.equal('05S000000000002');
      });

    test
      .stdout()
      .stderr()
      .it('passes deploy-all, test-level, and tests flags to promoteStage', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        promoteStageStub.resolves({
          requestId: 'mock-request-id',
          status: 'SUBMITTED',
          message: 'Work items successfully promoted.',
          promotedWorkitemIds: ['0Wx000000000001'],
        });

        await PromoteCommand.run([
          '-o',
          'testOrg',
          '-i',
          '0Wx000000000001',
          '-t',
          '05S000000000002',
          '--deploy-all',
          '--test-level',
          'RunLocalTests',
          '--tests',
          'MyTest',
        ]);

        const callArgs = promoteStageStub.firstCall.args[0];
        expect(callArgs.fullDeploy).to.be.true;
        expect(callArgs.testLevel).to.equal('RunLocalTests');
        expect(callArgs.runTests).to.deep.equal(['MyTest']);
      });

    test
      .stdout()
      .stderr()
      .it('promotes multiple work items', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        promoteStageStub.resolves({
          requestId: 'mock-request-id',
          status: 'SUBMITTED',
          message: 'Work items successfully promoted.',
          promotedWorkitemIds: ['0Wx000000000001', '0Wx000000000002'],
        });

        await PromoteCommand.run([
          '-o',
          'testOrg',
          '-i',
          '0Wx000000000001',
          '-i',
          '0Wx000000000002',
          '-t',
          '05S000000000002',
        ]);

        expect(ctx.stdout).to.contain('0Wx000000000001');
        expect(ctx.stdout).to.contain('0Wx000000000002');
        const callArgs = promoteStageStub.firstCall.args[0];
        expect(callArgs.workItemIds).to.deep.equal(['0Wx000000000001', '0Wx000000000002']);
      });
  });

  describe('work item not found', () => {
    test
      .stdout()
      .stderr()
      .it('errors when work item is not found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectIdFromWorkItemStub.rejects(
          new Error("Work item '0WxBAD' not found. Verify the work item ID and try again.")
        );

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '0WxBAD', '-t', '05S000000000002']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('not found');
        }
      });
  });

  describe('API error', () => {
    test
      .stdout()
      .stderr()
      .it('errors when promote API fails', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        promoteStageStub.rejects(new Error('Bad Request'));

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '0Wx000000000001', '-t', '05S000000000002']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to promote work items');
      });
  });
});
