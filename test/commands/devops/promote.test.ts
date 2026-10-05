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
  const findInFlightPromotionsStub = sinon.stub();
  const resolveProjectIdFromWorkItemStub = sinon.stub();
  const getPipelineIdForProjectStub = sinon.stub();
  const validatePromotionStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../src/commands/devops/promote.js', {
      '../../../src/utils/promoteStage.js': {
        promoteStage: promoteStageStub,
        findInFlightPromotions: findInFlightPromotionsStub,
      },
      '../../../src/utils/prepareWorkItem.js': {
        resolveProjectIdFromWorkItem: resolveProjectIdFromWorkItemStub,
      },
      '../../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: getPipelineIdForProjectStub,
      },
      '../../../src/utils/promotionUtils.js': {
        validatePromotion: validatePromotionStub,
      },
    });
    PromoteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    promoteStageStub.reset();
    findInFlightPromotionsStub.reset();
    // Default: no promotion in flight, so the guard is a no-op
    findInFlightPromotionsStub.resolves([]);
    resolveProjectIdFromWorkItemStub.reset();
    getPipelineIdForProjectStub.reset();
    validatePromotionStub.reset();
    validatePromotionStub.resolves({ success: true, errorType: null, errorDetails: null, combineDetails: null });
    // Default: all queried work items are promotable
    queryMock = sinon.stub().resolves({
      records: [
        { Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' },
        { Id: '1fkxx0000000002', Status: 'READY_TO_PROMOTE' },
      ],
    });
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
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' }] });
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
      .it('uses canonical 18-char IDs from SOQL for both validation and promotion', async () => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        // SOQL returns the full 18-char canonical ID even when user supplied 15-char
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkWt000000hGr7IAE', Status: 'READY_TO_PROMOTE' }] });
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkWt000000hGr7', '-t', '1QVxx0000000003']);

        expect(validatePromotionStub.firstCall.args[2]).to.deep.equal(['1fkWt000000hGr7IAE']);
        expect(promoteStageStub.firstCall.args[0].workItemIds).to.deep.equal(['1fkWt000000hGr7IAE']);
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

  // ── Work-item status eligibility ─────────────────────────────────────────

  describe('work-item path: status eligibility', () => {
    test
      .stdout()
      .stderr()
      .it('promotes work items with status "Ready to Promote"', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' }] });
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);

        expect(ctx.stdout).to.contain('SUBMITTED');
        expect(promoteStageStub.calledOnce).to.be.true;
      });

    test
      .stdout()
      .stderr()
      .it('promotes work items with status "Promoted"', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'PROMOTED' }] });
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);

        expect(ctx.stdout).to.contain('SUBMITTED');
        expect(promoteStageStub.calledOnce).to.be.true;
      });

    test
      .stdout()
      .stderr()
      .it('errors when a work item is not in an eligible status', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'In Progress' }] });

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(promoteStageStub.called).to.be.false;
        expect(ctx.stderr).to.contain('not eligible for promotion');
        expect(ctx.stderr).to.contain('1fkxx0000000001');
      });

    test
      .stdout()
      .stderr()
      .it('errors listing all ineligible IDs when multiple work items fail the status check', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({
          records: [
            { Id: '1fkxx0000000001', Status: 'Open' },
            { Id: '1fkxx0000000002', Status: 'In Progress' },
          ],
        });

        try {
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
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(promoteStageStub.called).to.be.false;
        expect(ctx.stderr).to.contain('1fkxx0000000001');
        expect(ctx.stderr).to.contain('1fkxx0000000002');
      });

    test
      .stdout()
      .stderr()
      .it('errors only for ineligible items when some pass and some fail the status check', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({
          records: [
            { Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' },
            { Id: '1fkxx0000000002', Status: 'IN_PROGRESS' },
          ],
        });

        try {
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
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(promoteStageStub.called).to.be.false;
        expect(ctx.stderr).to.not.contain('1fkxx0000000001');
        expect(ctx.stderr).to.contain('1fkxx0000000002');
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

        expect(ctx.stderr).to.contain('cannot also be provided');
      });
  });

  // ── Validation gate ───────────────────────────────────────────────────────

  describe('in-flight promotion guard', () => {
    test
      .stdout()
      .stderr()
      .it('blocks promotion when another promotion is already in flight', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' }] });
        findInFlightPromotionsStub.resolves([
          { id: '0Rq000000000001', requestToken: 'TOKEN-123', status: 'IN_PROGRESS' },
        ]);

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already in progress');
        expect(ctx.stderr).to.contain('TOKEN-123');
        // Neither validation nor the promote submission should run when blocked
        expect(validatePromotionStub.called).to.be.false;
        expect(promoteStageStub.called).to.be.false;
      });

    test
      .stdout()
      .stderr()
      .it('promotes anyway when --force is passed despite an in-flight promotion', async () => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' }] });
        findInFlightPromotionsStub.resolves([
          { id: '0Rq000000000001', requestToken: 'TOKEN-123', status: 'IN_PROGRESS' },
        ]);
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003', '--force']);

        // --force bypasses the guard entirely
        expect(findInFlightPromotionsStub.called).to.be.false;
        expect(promoteStageStub.calledOnce).to.be.true;
      });

    test
      .stdout()
      .stderr()
      .it('proceeds when the in-flight check itself fails (best-effort guard)', async () => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' }] });
        findInFlightPromotionsStub.rejects(new Error('query failed'));
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);

        expect(promoteStageStub.calledOnce).to.be.true;
      });
  });

  describe('validation gate', () => {
    test
      .stdout()
      .stderr()
      .it('runs validation before promoting and proceeds when validation passes', async () => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        queryMock = sinon.stub().resolves({ records: [{ Id: '1fkxx0000000001', Status: 'READY_TO_PROMOTE' }] });
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);

        expect(validatePromotionStub.calledOnce).to.be.true;
        const validateArgs = validatePromotionStub.firstCall.args;
        expect(validateArgs[1]).to.equal('PIPE001');
        expect(validateArgs[2]).to.deep.equal(['1fkxx0000000001']);
        expect(validateArgs[3]).to.equal('1QVxx0000000003');
        expect(validateArgs[4]).to.be.false; // checkCombineDetails always false in pre-promote gate
        expect(validateArgs[5]).to.be.false; // allWorkItemsInStage false for work-item path
        expect(promoteStageStub.calledOnce).to.be.true;
      });

    test
      .stdout()
      .stderr()
      .it('blocks promotion and errors when validation fails without combine details', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: false,
          errorType: 'MISSING_PR',
          errorDetails: 'No PR associated with work item',
          combineDetails: null,
        });

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(promoteStageStub.called).to.be.false;
        expect(ctx.stderr).to.contain('MISSING_PR');
      });

    test
      .stdout()
      .stderr()
      .it('formats HTML-encoded JSON error details into human-readable lines', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: false,
          errorType: 'CHANGE_REQUEST_VALIDATION',
          errorDetails:
            '[{&quot;reason&quot;:&quot;PR_DOES_NOT_EXIST&quot;,&quot;workItem&quot;:&quot;WI-000132&quot;}]',
          combineDetails: null,
        });

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('WI-000132');
        expect(ctx.stderr).to.contain('no pull request exists');
        expect(ctx.stderr).to.not.contain('&quot;');
        expect(ctx.stderr).to.not.contain('PR_DOES_NOT_EXIST');
      });

    test
      .stdout()
      .stderr()
      .it('formats multiple work item errors into a comma-separated list', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: false,
          errorType: 'CHANGE_REQUEST_VALIDATION',
          errorDetails:
            '[{&quot;reason&quot;:&quot;PR_DOES_NOT_EXIST&quot;,&quot;workItem&quot;:&quot;WI-000132&quot;},{&quot;reason&quot;:&quot;PR_NOT_MERGED&quot;,&quot;workItem&quot;:&quot;WI-000133&quot;}]',
          combineDetails: null,
        });

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('WI-000132: no pull request exists');
        expect(ctx.stderr).to.contain('WI-000133: pull request has not been merged');
      });

    test
      .stdout()
      .stderr()
      .it('prints combine details and errors when validation fails with combine required', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: false,
          errorType: 'COMBINE_REQUIRED',
          errorDetails: 'Work items must be combined',
          combineDetails: { workItemIds: ['1fkxx0000000001', '1fkxx0000000002'] },
        });

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(promoteStageStub.called).to.be.false;
        expect(ctx.stdout).to.contain('1fkxx0000000001');
        expect(ctx.stdout).to.contain('1fkxx0000000002');
        expect(ctx.stderr).to.contain('COMBINE_REQUIRED');
      });

    test
      .stdout()
      .stderr()
      .it('skips validation and promotes directly when --skip-validation is passed', async () => {
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
          '--skip-validation',
        ]);

        expect(validatePromotionStub.called).to.be.false;
        expect(promoteStageStub.calledOnce).to.be.true;
      });

    test
      .stdout()
      .stderr()
      .it('surfaces DevOps Center not enabled error from validation', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.rejects(new Error("sObject type 'DevopsPromotionRequest' is not supported"));

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
        } catch (e) {
          // expected
        }

        expect(promoteStageStub.called).to.be.false;
        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });

    test
      .stdout()
      .stderr()
      .it('surfaces generic validation request failure', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.rejects(new Error('Network timeout'));

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
        } catch (e) {
          // expected
        }

        expect(promoteStageStub.called).to.be.false;
        expect(ctx.stderr).to.contain('pre-promote validation');
      });

    test
      .stdout()
      .stderr()
      .it('runs validation using resolved work item IDs when --stage-id is used', async () => {
        queryMock = sinon
          .stub()
          .onFirstCall()
          .resolves({ records: [{ DevopsPipelineId: '1QVxx0000000001' }] })
          .onSecondCall()
          .resolves({ records: [{ NextStageId: '1QVxx0000000003' }] })
          .onThirdCall()
          .resolves({ records: [{ Id: '1fkxx0000000001' }, { Id: '1fkxx0000000002' }] });
        promoteStageStub.resolves(mockPromoteResult);

        await PromoteCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000002', '-t', '1QVxx0000000003']);

        expect(validatePromotionStub.calledOnce).to.be.true;
        expect(validatePromotionStub.firstCall.args[2]).to.deep.equal(['1fkxx0000000001', '1fkxx0000000002']);
        expect(validatePromotionStub.firstCall.args[5]).to.be.true; // allWorkItemsInStage true for stage path
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

    test
      .stdout()
      .stderr()
      .it('strips API error code prefix from promote error message', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        promoteStageStub.rejects(
          new Error(
            'PROMOTION_SOURCE_CODE_REPOSITORY_BRANCH_NOT_FOUND:No source code repository branch found for work item: 1fkxx0000000001'
          )
        );

        try {
          await PromoteCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('No source code repository branch found');
        expect(ctx.stderr).to.not.contain('PROMOTION_SOURCE_CODE_REPOSITORY_BRANCH_NOT_FOUND:');
      });
  });
});
