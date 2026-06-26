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
import { ConfigAggregator, Org, StreamingClient } from '@salesforce/core';
import { HttpRequest } from '@jsforce/jsforce-node';
import { ConfigVars } from '../../../../../src/configMeta.js';
import AsyncOpStreaming from '../../../../../src/streamer/processors/asyncOpStream.js';
import { AsyncOperationStatus, PipelineStage } from '../../../../../src/common/index.js';

let requestMock: sinon.SinonStub;

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
      getApiVersion: () => '1',
    };
  },
};

const stubStreamingClient = async (options?: StreamingClient.Options) => ({
  handshake: async () => StreamingClient.ConnectionState.CONNECTED,
  replay: async () => -1,
  subscribe: async () =>
    options?.streamProcessor({
      payload: { message: 'Completed' },
      event: { replayId: 20 },
    }),
});

describe('project deploy pipeline validate', () => {
  let sandbox: sinon.SinonSandbox;
  let pipelineStageMock: PipelineStage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ValidateCommand: any;
  const $$ = new TestContext();

  const fetchAndValidatePipelineStageStub = sinon.stub();
  const fetchAsyncOperationResultStub = sinon.stub();
  const displayEndResultsStub = sinon.stub().resolves();
  const getStatusStub = sinon.stub();
  const printOpSummaryStub = sinon.stub().resolves();

  // Mock output service factory to avoid module-tree duplication issues
  const mockOutputService = {
    setAorId: sinon.stub(),
    printAorId: sinon.stub(),
    printOpSummary: printOpSummaryStub,
    printAorStatus: sinon.stub(),
    displayEndResults: displayEndResultsStub,
    getStatus: getStatusStub,
  };

  class MockOutputServiceFactory {
    // eslint-disable-next-line class-methods-use-this
    public forDeployment() {
      return mockOutputService;
    }
    // eslint-disable-next-line class-methods-use-this
    public forResume() {
      return mockOutputService;
    }
  }

  before(async () => {
    const realCommonIndex = await import('../../../../../src/common/index.js');
    const mockedAsyncOp = await esmock('../../../../../src/common/base/abstractAsyncOperation.js', {
      '../../../../../src/common/index.js': {
        ...realCommonIndex,
        fetchAsyncOperationResult: fetchAsyncOperationResultStub,
      },
    });
    const mockedPromote = await esmock('../../../../../src/common/base/abstractPromote.js', {
      '../../../../../src/common/base/abstractAsyncOperation.js': mockedAsyncOp,
      '../../../../../src/common/index.js': {
        ...realCommonIndex,
        fetchAndValidatePipelineStage: fetchAndValidatePipelineStageStub,
      },
      '../../../../../src/common/outputService/index.js': {
        OutputServiceFactory: MockOutputServiceFactory,
      },
    });
    const mockedStart = await esmock('../../../../../src/commands/project/deploy/pipeline/start.js', {
      '../../../../../src/common/base/abstractPromote.js': mockedPromote,
    });
    const mod = await esmock('../../../../../src/commands/project/deploy/pipeline/validate.js', {
      '../../../../../src/commands/project/deploy/pipeline/start.js': mockedStart,
    });
    ValidateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchAndValidatePipelineStageStub.reset();
    fetchAsyncOperationResultStub.reset();
    displayEndResultsStub.reset();
    getStatusStub.reset();
    printOpSummaryStub.reset();
    mockOutputService.setAorId.reset();
    mockOutputService.printAorId.reset();
    mockOutputService.printAorStatus.reset();
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

  describe('request promotion', () => {
    const firstStageId = 'mock-first-stage-id';

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });
      fetchAsyncOperationResultStub.resolves({ Id: 'MockId' });
    });

    test
      .stdout()
      .stderr()
      .it('correctly sets the promote option to perfom a checkDeploy promotion', async () => {
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        fetchAndValidatePipelineStageStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

        await ValidateCommand.run(['-p=testProject', '-b=testBranch']);

        expect(requestMock.called).to.equal(true);
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"checkDeploy":true');
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline validate and handles the verbose flag correctly ', async () => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        fetchAndValidatePipelineStageStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves('MockId');
        getStatusStub.returns(AsyncOperationStatus.Completed);

        await ValidateCommand.run(['-p=testProject', '-b=testBranch', '--wait=3', '--verbose']);

        expect(displayEndResultsStub.called).to.equal(true);
      });
  });
});
