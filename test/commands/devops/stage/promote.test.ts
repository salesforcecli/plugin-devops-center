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

let queryMock: sinon.SinonStub;

// Query 1: target stage → pipelineId, Query 2: source stage lookup, Query 3: work items in source stage
const mockStageQueryRecord = { DevopsPipelineId: 'mock-pipeline-id' };
const mockSourceStageRecord = { Id: 'mock-source-stage-id' };
const mockWorkItemRecords = [{ Id: 'mock-work-item-id-1' }, { Id: 'mock-work-item-id-2' }];

const mockPromoteResult = {
  requestId: 'mock-request-id',
  status: 'SUBMITTED',
  message: 'Submitted for promotion',
  promotedWorkitemIds: ['mock-work-item-id-1', 'mock-work-item-id-2'],
};

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getAlias() {
    return ['doceOrg'];
  },
  getConnection() {
    return {
      query: queryMock,
      getApiVersion: () => '65.0',
    };
  },
};

describe('devops stage promote', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PromoteCommand: any;
  const promoteStageStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/stage/promote.js', {
      '../../../../src/utils/promoteStage.js': {
        promoteStage: promoteStageStub,
      },
    });
    PromoteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    promoteStageStub.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(DOCE_ORG);
  });

  afterEach(() => {
    sandbox.restore();
  });

  function setupQueryMock(): void {
    queryMock = sinon
      .stub()
      .onFirstCall()
      .resolves({ records: [mockStageQueryRecord] })
      .onSecondCall()
      .resolves({ records: [mockSourceStageRecord] })
      .onThirdCall()
      .resolves({ records: mockWorkItemRecords });
    DOCE_ORG.getConnection = () => ({ query: queryMock, getApiVersion: () => '65.0' } as never);
    promoteStageStub.resolves(mockPromoteResult);
  }

  describe('successful promotion', () => {
    test
      .stdout()
      .stderr()
      .it('calls promoteStage with pipeline ID, work item IDs, and target stage ID', async (ctx) => {
        setupQueryMock();

        await PromoteCommand.run(['-o', 'doceOrg', '-t', 'mock-target-stage-id']);

        expect(promoteStageStub.calledOnce).to.be.true;
        const callArgs = promoteStageStub.firstCall.args[0];
        expect(callArgs.pipelineId).to.equal('mock-pipeline-id');
        expect(callArgs.targetStageId).to.equal('mock-target-stage-id');
        expect(callArgs.workItemIds).to.deep.equal(['mock-work-item-id-1', 'mock-work-item-id-2']);
        expect(ctx.stdout).to.contain('SUBMITTED');
        expect(ctx.stdout).to.contain('mock-request-id');
      });

    test
      .stdout()
      .stderr()
      .it('passes deploy-all, test-level, and tests flags to promoteStage', async () => {
        setupQueryMock();

        await PromoteCommand.run([
          '-o',
          'doceOrg',
          '-t',
          'mock-target-stage-id',
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
  });

  describe('error cases', () => {
    test
      .stdout()
      .stderr()
      .it('errors when stage is not found', async () => {
        queryMock = sinon.stub().resolves({ records: [] });
        DOCE_ORG.getConnection = () => ({ query: queryMock, getApiVersion: () => '65.0' } as never);

        try {
          await PromoteCommand.run(['-o', 'doceOrg', '-t', 'bad-stage-id']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('bad-stage-id');
        }
      });

    test
      .stdout()
      .stderr()
      .it('errors when no work items exist in the source stage', async () => {
        queryMock = sinon
          .stub()
          .onFirstCall()
          .resolves({ records: [mockStageQueryRecord] })
          .onSecondCall()
          .resolves({ records: [mockSourceStageRecord] })
          .onThirdCall()
          .resolves({ records: [] });
        DOCE_ORG.getConnection = () => ({ query: queryMock, getApiVersion: () => '65.0' } as never);

        try {
          await PromoteCommand.run(['-o', 'doceOrg', '-t', 'mock-target-stage-id']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('No work items found');
        }
      });

    test
      .stdout()
      .stderr()
      .it('errors when --target-stage-id is missing', async (ctx) => {
        try {
          await PromoteCommand.run([]);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('Missing required flag target-stage-id');
      });
  });
});
