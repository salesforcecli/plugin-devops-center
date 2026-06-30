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
  const selectPipelineStagesStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/work-item/promote.js', {
      '../../../../src/utils/promoteStage.js': {
        promoteStage: promoteStageStub,
      },
      '../../../../src/common/selectors/pipelineStageSelector.js': {
        selectPipelineStagesByProject: selectPipelineStagesStub,
      },
      '../../../../src/common/flags/flags.js': {
        requiredDoceOrgFlag: () => ({
          type: 'option' as const,
          char: 'c' as const,
          parse: async () => mockOrg,
          default: async () => mockOrg,
          required: true,
        }),
        devopsCenterProjectName: {
          type: 'option' as const,
          char: 'p' as const,
          required: true,
        },
      },
    });
    PromoteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    promoteStageStub.reset();
    selectPipelineStagesStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const mockStages = [
    {
      Id: 'stage1',
      Name: 'Integration',
      sf_devops__Branch__r: { sf_devops__Name__c: 'integration' },
      sf_devops__Pipeline__r: { sf_devops__Project__c: 'PIPE001' },
      sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
    },
  ];

  describe('successful promotion', () => {
    test
      .stdout()
      .stderr()
      .it('promotes a single work item and displays output', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        selectPipelineStagesStub.resolves(mockStages);
        promoteStageStub.resolves({
          jobId: '0Af000000000001',
          status: 'Completed',
          message: 'Work items successfully promoted to UAT.',
          errorDetails: '',
        });

        await PromoteCommand.run([
          '-c',
          'testOrg',
          '-p',
          'MyApp Release',
          '-i',
          '0Wx000000000001',
          '-t',
          '05S000000000002',
        ]);

        expect(ctx.stdout).to.contain('Completed');
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
      .it('promotes multiple work items', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        selectPipelineStagesStub.resolves(mockStages);
        promoteStageStub.resolves({
          jobId: '0Af000000000001',
          status: 'Completed',
          message: 'Work items successfully promoted.',
          errorDetails: '',
        });

        await PromoteCommand.run([
          '-c',
          'testOrg',
          '-p',
          'MyApp Release',
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

  describe('project not found', () => {
    test
      .stdout()
      .stderr()
      .it('errors when project is not found', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        const err = new Error('No results found');
        err.name = 'No-results-foundError';
        selectPipelineStagesStub.rejects(err);

        try {
          await PromoteCommand.run([
            '-c',
            'testOrg',
            '-p',
            'NonExistent',
            '-i',
            '0Wx000000000001',
            '-t',
            '05S000000000002',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("doesn't exist");
      });
  });

  describe('API error', () => {
    test
      .stdout()
      .stderr()
      .it('errors when promote API fails', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        selectPipelineStagesStub.resolves(mockStages);
        promoteStageStub.rejects(new Error('Bad Request'));

        try {
          await PromoteCommand.run([
            '-c',
            'testOrg',
            '-p',
            'MyApp Release',
            '-i',
            '0Wx000000000001',
            '-t',
            '05S000000000002',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to promote work items');
      });
  });
});
