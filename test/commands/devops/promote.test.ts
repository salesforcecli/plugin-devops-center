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

let queryMock: sinon.SinonStub;

const mockPromoteResult = {
  requestId: 'mock-request-id',
  status: 'SUBMITTED',
  message: 'Submitted for promotion',
  promotedWorkitemIds: ['1fkxx0000000001', '1fkxx0000000002'],
};

const mockOrg = {
  id: '1',
  getOrgId: () => '1',
  getUsername: () => 'testOrg',
  getConnection() {
    return { query: queryMock, getApiVersion: () => '65.0' };
  },
};

describe('devops promote', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PromoteCommand: any;
  const promoteStageStub = sinon.stub();
  const resolveProjectIdFromWorkItemStub = sinon.stub();
  const getPipelineIdForProjectStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../src/commands/devops/promote.js', {
      '../../../src/utils/promoteStage.js': {
        promoteStage: promoteStageStub,
      },
      '../../../src/utils/prepareWorkItem.js': {
        resolveProjectIdFromWorkItem: resolveProjectIdFromWorkItemStub,
      },
      '../../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: getPipelineIdForProjectStub,
      },
    });
    PromoteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    promoteStageStub.reset();
    resolveProjectIdFromWorkItemStub.reset();
    getPipelineIdForProjectStub.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(mockOrg);
  });

  afterEach(() => {
    sandbox.restore();
  });

  // ── Work-item path ────────────────────────────────────────────────────────

  describe('work-item path: successful promotion', () => {
    test
      .stdout()
      .stderr()
      .it('promotes a single work item', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);

        expect(ctx.stdout).to.contain('SUBMITTED');
        expect(ctx.stdout).to.contain('mock-request-id');
        expect(ctx.stdout).to.contain('1fkxx0000000001');
        const args = promoteStageStub.firstCall.args[0];
        expect(args.pipelineId).to.equal('PIPE001');
        expect(args.workItemIds).to.deep.equal(['1fkxx0000000001']);
        expect(args.targetStageId).to.equal('1QVxx0000000003');
      });

    test
      .stdout()
      .stderr()
      .it('promotes multiple work items', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        promoteStageStub.resolves({
          ...mockPromoteResult,
          promotedWorkitemIds: ['1fkxx0000000001', '1fkxx0000000002'],
        });

        await PromoteCommand.run([
          '-o',
          'testOrg',
          '-i',
          '1fkxx0000000001',
          '-i',
          '1fkxx0000000002',
          '-t',
          '1QVxx0000000003',
        ]);

        expect(ctx.stdout).to.contain('1fkxx0000000001');
        expect(ctx.stdout).to.contain('1fkxx0000000002');
        expect(promoteStageStub.firstCall.args[0].workItemIds).to.deep.equal(['1fkxx0000000001', '1fkxx0000000002']);
      });

    test
      .stdout()
      .stderr()
      .it('passes deploy-all, test-level, and tests to promoteStage', async () => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run([
          '-o',
          'testOrg',
          '-i',
          '1fkxx0000000001',
          '-t',
          '1QVxx0000000003',
          '--deploy-all',
          '--test-level',
          'RunLocalTests',
          '--tests',
          'MyTest',
        ]);

        const args = promoteStageStub.firstCall.args[0];
        expect(args.fullDeploy).to.be.true;
        expect(args.testLevel).to.equal('RunLocalTests');
        expect(args.runTests).to.deep.equal(['MyTest']);
      });
  });

  describe('work-item path: error cases', () => {
    test
      .stdout()
      .stderr()
      .it('errors when work item is not found', async () => {
        resolveProjectIdFromWorkItemStub.rejects(
          new Error("Work item '1fkxx0000000099' not found. Verify the work item ID and try again.")
        );

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000099', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('not found');
        }
      });

    test
      .stdout()
      .stderr()
      .it('errors when no pipeline is found for the work item', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves(null);

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('No pipeline found');
      });
  });

  // ── Stage path ────────────────────────────────────────────────────────────

  describe('stage path: successful promotion', () => {
    test
      .stdout()
      .stderr()
      .it('promotes all work items from the source stage', async (ctx) => {
        queryMock = sinon
          .stub()
          // source stage → pipelineId
          .onFirstCall()
          .resolves({ records: [{ DevopsPipelineId: '1QVxx0000000001' }] })
          // source stage → NextStageId validation
          .onSecondCall()
          .resolves({ records: [{ NextStageId: '1QVxx0000000003' }] })
          // work items in source stage
          .onThirdCall()
          .resolves({ records: [{ Id: '1fkxx0000000001' }, { Id: '1fkxx0000000002' }] });
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000002', '-t', '1QVxx0000000003']);

        expect(ctx.stdout).to.contain('SUBMITTED');
        expect(ctx.stdout).to.contain('mock-request-id');
        const args = promoteStageStub.firstCall.args[0];
        expect(args.pipelineId).to.equal('1QVxx0000000001');
        expect(args.targetStageId).to.equal('1QVxx0000000003');
        expect(args.workItemIds).to.deep.equal(['1fkxx0000000001', '1fkxx0000000002']);
      });

    test
      .stdout()
      .stderr()
      .it('passes deploy-all, test-level, and tests to promoteStage', async () => {
        queryMock = sinon
          .stub()
          .onFirstCall()
          .resolves({ records: [{ DevopsPipelineId: '1QVxx0000000001' }] })
          .onSecondCall()
          .resolves({ records: [{ NextStageId: '1QVxx0000000003' }] })
          .onThirdCall()
          .resolves({ records: [{ Id: '1fkxx0000000001' }] });
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run([
          '-o',
          'testOrg',
          '-s',
          '1QVxx0000000002',
          '-t',
          '1QVxx0000000003',
          '--deploy-all',
          '--test-level',
          'RunLocalTests',
          '--tests',
          'MyTest',
        ]);

        const args = promoteStageStub.firstCall.args[0];
        expect(args.fullDeploy).to.be.true;
        expect(args.testLevel).to.equal('RunLocalTests');
        expect(args.runTests).to.deep.equal(['MyTest']);
      });
  });

  describe('stage path: error cases', () => {
    test
      .stdout()
      .stderr()
      .it('errors when source stage is not found', async () => {
        queryMock = sinon.stub().resolves({ records: [] });

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000099', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('1QVxx0000000099');
        }
      });

    test
      .stdout()
      .stderr()
      .it('errors when source stage does not feed into target stage', async () => {
        queryMock = sinon
          .stub()
          .onFirstCall()
          .resolves({ records: [{ DevopsPipelineId: '1QVxx0000000001' }] })
          .onSecondCall()
          .resolves({ records: [{ NextStageId: '1QVxx0000000999' }] }); // different target

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000002', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('does not feed into');
        }
      });

    test
      .stdout()
      .stderr()
      .it('errors when no work items exist in the source stage', async () => {
        queryMock = sinon
          .stub()
          .onFirstCall()
          .resolves({ records: [{ DevopsPipelineId: '1QVxx0000000001' }] })
          .onSecondCall()
          .resolves({ records: [{ NextStageId: '1QVxx0000000003' }] })
          .onThirdCall()
          .resolves({ records: [] });

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000002', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('No work items found');
        }
      });
  });

  // ── Mutual exclusion / missing flags ─────────────────────────────────────

  describe('flag validation', () => {
    test
      .stdout()
      .stderr()
      .it('errors when neither --work-item-id nor --stage-id is provided', async (ctx) => {
        try {
          await PromoteCommand.run(['-o', 'testOrg', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('--work-item-id');
      });

    test
      .stdout()
      .stderr()
      .it('errors when both --work-item-id and --stage-id are provided', async (ctx) => {
        try {
          await PromoteCommand.run([
            '-o',
            'testOrg',
            '-i',
            '1fkxx0000000001',
            '-s',
            '1QVxx0000000002',
            '-t',
            '1QVxx0000000003',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('exclusive');
      });
  });

  // ── Shared error cases ────────────────────────────────────────────────────

  describe('API errors', () => {
    test
      .stdout()
      .stderr()
      .it('surfaces DevOps Center not enabled error', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        promoteStageStub.rejects(new Error("sObject type 'DevopsPromotionRequest' is not supported"));

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });

    test
      .stdout()
      .stderr()
      .it('surfaces promote failed error', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        promoteStageStub.rejects(new Error('Bad Request'));

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to promote');
      });
  });
});
