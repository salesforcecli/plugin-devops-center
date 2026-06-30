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
import { TestContext } from '@salesforce/core/testSetup';
import sinon from 'sinon';
import { ConfigAggregator, Org } from '@salesforce/core';
import { ConfigVars } from '../../../../src/configMeta.js';
import { AsyncOperationStatus, PipelineStage } from '../../../../src/common/index.js';

let requestMock: sinon.SinonStub;
let queryMock: sinon.SinonStub;

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
      request: requestMock,
      query: queryMock,
      getApiVersion: () => '65.0',
    };
  },
};

describe('devops stage promote', () => {
  let sandbox: sinon.SinonSandbox;
  let pipelineStageMock: PipelineStage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PromoteCommand: any;
  const $$ = new TestContext();

  const esmockFetchAndValidateStub = sinon.stub();
  const esmockFetchAsyncOpResultStub = sinon.stub();
  const promoteStageStub = sinon.stub();
  const getPipelineIdForProjectStub = sinon.stub();

  const mockOutputService = {
    setAorId: sinon.stub(),
    printAorId: sinon.stub(),
    printOpSummary: sinon.stub(),
    printAorStatus: sinon.stub(),
    displayEndResults: sinon.stub(),
    getStatus: sinon.stub(),
  };

  function resetMockOutputService(): void {
    mockOutputService.setAorId.reset();
    mockOutputService.printAorId.reset();
    mockOutputService.printOpSummary.reset();
    mockOutputService.printAorStatus.reset();
    mockOutputService.displayEndResults.reset();
    mockOutputService.displayEndResults.resolves();
    mockOutputService.getStatus.reset();
  }

  class MockOutputServiceFactory {
    // eslint-disable-next-line class-methods-use-this
    public forDeployment() {
      return mockOutputService;
    }
  }

  before(async () => {
    const realCommonIndex = await import('../../../../src/common/index.js');
    const mockedAsyncOp = await esmock('../../../../src/common/base/abstractAsyncOperation.js', {
      '../../../../src/common/index.js': {
        ...realCommonIndex,
        fetchAsyncOperationResult: esmockFetchAsyncOpResultStub,
      },
    });
    const mockedPromote = await esmock('../../../../src/common/base/abstractPromote.js', {
      '../../../../src/common/base/abstractAsyncOperation.js': mockedAsyncOp,
      '../../../../src/common/index.js': {
        ...realCommonIndex,
        fetchAndValidatePipelineStage: esmockFetchAndValidateStub,
      },
      '../../../../src/common/outputService/index.js': {
        OutputServiceFactory: MockOutputServiceFactory,
      },
    });
    const mod = await esmock('../../../../src/commands/devops/stage/promote.js', {
      '../../../../src/common/base/abstractPromote.js': mockedPromote,
      '../../../../src/utils/promoteStage.js': {
        promoteStage: promoteStageStub,
      },
      '../../../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: getPipelineIdForProjectStub,
      },
    });
    PromoteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    esmockFetchAndValidateStub.reset();
    esmockFetchAsyncOpResultStub.reset();
    promoteStageStub.reset();
    getPipelineIdForProjectStub.reset();
    getPipelineIdForProjectStub.resolves('mock-pipeline-id');
    resetMockOutputService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(DOCE_ORG);
    sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
      value: 'TARGET_DEVOPS_CENTER_ALIAS',
      key: ConfigVars.TARGET_DEVOPS_CENTER,
      isLocal: () => false,
      isGlobal: () => true,
      isEnvVar: () => false,
    });
    $$.setConfigStubContents('DeployPipelineCache', {});
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful promotion', () => {
    test
      .stdout()
      .stderr()
      .it('promotes work items using the Connect API', async () => {
        pipelineStageMock = {
          Id: 'mock-target-stage-id',
          Name: 'UAT',
          sf_devops__Branch__r: { sf_devops__Name__c: 'uat' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: {
            records: [
              {
                Id: 'mock-source-stage-id',
                Name: 'Integration',
                sf_devops__Branch__r: { sf_devops__Name__c: 'integration' },
                sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
                sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
              },
            ],
          },
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        queryMock = sinon.stub().resolves({
          records: [{ Id: '0Wx000000000001' }, { Id: '0Wx000000000002' }],
        });
        promoteStageStub.resolves({ jobId: 'mock-aor-id', status: '', message: '', errorDetails: '' });

        const aorMock = {
          Id: 'mock-aor-id',
          sf_devops__Status__c: AsyncOperationStatus.Completed,
          sf_devops__Message__c: '',
        };
        esmockFetchAsyncOpResultStub.resolves(aorMock);

        await PromoteCommand.run(['-p=testProject', '-b=uat', '--async']);

        expect(getPipelineIdForProjectStub.calledOnce).to.be.true;
        expect(getPipelineIdForProjectStub.firstCall.args[1]).to.equal('mockProjectId');
        expect(promoteStageStub.calledOnce).to.be.true;
        const callArgs = promoteStageStub.firstCall.args[0];
        expect(callArgs.pipelineId).to.equal('mock-pipeline-id');
        expect(callArgs.targetStageId).to.equal('mock-target-stage-id');
        expect(callArgs.workItemIds).to.deep.equal(['0Wx000000000001', '0Wx000000000002']);
      });
  });

  describe('first stage promotion (Approved)', () => {
    test
      .stdout()
      .stderr()
      .it('queries approved work items when promoting to first stage', async () => {
        pipelineStageMock = {
          Id: 'mock-first-stage-id',
          Name: 'Integration',
          sf_devops__Branch__r: { sf_devops__Name__c: 'integration' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        queryMock = sinon.stub().resolves({
          records: [{ Id: '0Wx000000000001' }],
        });
        promoteStageStub.resolves({ jobId: 'mock-aor-id', status: '', message: '', errorDetails: '' });

        const aorMock = {
          Id: 'mock-aor-id',
          sf_devops__Status__c: AsyncOperationStatus.Completed,
          sf_devops__Message__c: '',
        };
        esmockFetchAsyncOpResultStub.resolves(aorMock);

        await PromoteCommand.run(['-p=testProject', '-b=integration', '--async']);

        expect(queryMock.calledOnce).to.be.true;
        const query = queryMock.firstCall.args[0] as string;
        expect(query).to.contain("Status = 'Approved'");
        expect(query).to.contain('mockProjectId');
      });
  });

  describe('no work items error', () => {
    test
      .stdout()
      .stderr()
      .it('errors when no work items found in source stage', async (ctx) => {
        pipelineStageMock = {
          Id: 'mock-target-stage-id',
          Name: 'UAT',
          sf_devops__Branch__r: { sf_devops__Name__c: 'uat' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: {
            records: [
              {
                Id: 'mock-source-stage-id',
                Name: 'Integration',
                sf_devops__Branch__r: { sf_devops__Name__c: 'integration' },
                sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
                sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
              },
            ],
          },
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        queryMock = sinon.stub().resolves({ records: [] });

        try {
          await PromoteCommand.run(['-p=testProject', '-b=uat', '--async']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('No work items found');
      });
  });

  describe('flag validation', () => {
    test
      .stdout()
      .stderr()
      .it('errors when branch name is missing', async (ctx) => {
        try {
          await PromoteCommand.run(['-p=testProject']);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('Missing required flag branch-name');
      });

    test
      .stdout()
      .stderr()
      .it('errors when project name is missing', async (ctx) => {
        try {
          await PromoteCommand.run(['-b=testBranch']);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('Missing required flag devops-center-project-name');
      });
  });
});
