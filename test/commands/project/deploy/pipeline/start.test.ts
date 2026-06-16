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
import { REST_PROMOTE_BASE_URL } from '../../../../../src/common/constants.js';
import { DeployPipelineCache } from '../../../../../src/common/deployPipelineCache.js';

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

describe('project deploy pipeline start', () => {
  let sandbox: sinon.SinonSandbox;
  let pipelineStageMock: PipelineStage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let StartCommand: any;
  const $$ = new TestContext();

  const esmockFetchAndValidateStub = sinon.stub();
  const esmockFetchAsyncOpResultStub = sinon.stub();
  const esmockSleepStub = sinon.stub();
  const esmockSelectAorByIdStub = sinon.stub();

  // Mock output service to avoid esmock module-tree duplication issues with prototype stubs
  let capturedAorId = '';
  const mockOutputService = {
    setAorId: sinon.stub(),
    printAorId: sinon.stub(),
    printOpSummary: sinon.stub(),
    printAorStatus: sinon.stub(),
    displayEndResults: sinon.stub(),
    getStatus: sinon.stub(),
  };

  function resetMockOutputService(): void {
    capturedAorId = '';
    mockOutputService.setAorId.reset();
    mockOutputService.setAorId.callsFake((id: string) => {
      capturedAorId = id;
    });
    mockOutputService.printAorId.reset();
    mockOutputService.printAorId.callsFake(() => {
      // eslint-disable-next-line no-console
      console.log(`Job ID: ${capturedAorId}`);
    });
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
        fetchAsyncOperationResult: esmockFetchAsyncOpResultStub,
      },
    });
    const mockedPromote = await esmock('../../../../../src/common/base/abstractPromote.js', {
      '../../../../../src/common/base/abstractAsyncOperation.js': mockedAsyncOp,
      '../../../../../src/common/index.js': {
        ...realCommonIndex,
        fetchAndValidatePipelineStage: esmockFetchAndValidateStub,
      },
      '../../../../../src/common/utils.js': {
        sleep: esmockSleepStub,
      },
      '../../../../../src/common/outputService/index.js': {
        OutputServiceFactory: MockOutputServiceFactory,
      },
    });
    const mod = await esmock('../../../../../src/commands/project/deploy/pipeline/start.js', {
      '../../../../../src/common/base/abstractPromote.js': mockedPromote,
    });
    StartCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    esmockFetchAndValidateStub.reset();
    esmockFetchAsyncOpResultStub.reset();
    esmockSleepStub.reset();
    esmockSleepStub.resolves();
    esmockSelectAorByIdStub.reset();
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

  describe('validate flags', () => {
    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline start with no provided project name', async (ctx) => {
        try {
          await StartCommand.run(['--branch-name=test']);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('Missing required flag devops-center-project-name');
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline start with no provided branch name', async (ctx) => {
        try {
          await StartCommand.run(['--devops-center-project-name=test']);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('Missing required flag branch-name');
      });

    test
      .stdout()
      .stderr()
      .it(
        'runs project deploy pipeline start with test level RunSpecifiedTests but does not indicate specific tests with flag -t',
        async (ctx) => {
          try {
            await StartCommand.run(['-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests']);
          } catch (e) {
            // expected
          }
          expect(ctx.stderr).to.contain(
            'You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.'
          );
        }
      );

    test
      .stdout()
      .stderr()
      .it(
        'runs project deploy pipeline start indicating specific tests to run but with test level other than RunSpecifiedTests',
        async (ctx) => {
          try {
            await StartCommand.run(['-p=testProject', '-b=testBranch', '-l=RunLocalTests', '-t=DummyTestClass']);
          } catch (e) {
            // expected
          }
          expect(ctx.stderr).to.contain('runTests can be used only with a testLevel of RunSpecifiedTests.');
        }
      );

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline start with the correct flags and validation pass', async (ctx) => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        const aorMock = {
          Id: 'mock-id',
          sf_devops__Status__c: AsyncOperationStatus.Completed,
          sf_devops__Message__c: 'Completed',
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        esmockFetchAsyncOpResultStub.resolves(aorMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });

        await StartCommand.run(['-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests', '-t=DummyTestClass']);

        expect(ctx.error).to.be.undefined;
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline start and handles a GenericTimeoutError', async (ctx) => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        sandbox
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .stub(AsyncOpStreaming.prototype, 'monitor' as any)
          .throwsException({ name: 'GenericTimeoutError' });
        const aorMock = {
          Id: 'mock-id',
          sf_devops__Status__c: AsyncOperationStatus.InProgress,
          sf_devops__Message__c: 'Completed',
        };
        esmockFetchAsyncOpResultStub.resolves(aorMock);

        try {
          await StartCommand.run(['-p=testProject', '-b=testBranch', '--wait=3']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('The command has timed out');
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline start and handles the verbose flag correctly ', async () => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });
        mockOutputService.getStatus.returns(AsyncOperationStatus.Completed);
        esmockFetchAsyncOpResultStub.resolves({ Id: 'mock-aor-id' });

        await StartCommand.run(['-p=testProject', '-b=testBranch', '--wait=3', '--verbose']);

        expect(mockOutputService.displayEndResults.called).to.equal(true);
      });
  });

  describe('cache', () => {
    test
      .stdout()
      .stderr()
      .it('caches the aorId when running project deploy pipeline start with the async flag', async () => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        const mockAorRecord = {
          Id: 'mock-aor-id',
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.InProgress,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        esmockFetchAsyncOpResultStub.resolves(mockAorRecord);

        await StartCommand.run(['-p=testProject', '-b=testBranch', '--async']);

        const cache = await DeployPipelineCache.create();
        const key = cache.getLatestKeyOrThrow();
        expect(key).not.to.be.undefined;
      });

    test
      .stdout()
      .stderr()
      .it('caches the aorId when running project deploy pipeline start without the async flag', async () => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });
        esmockFetchAsyncOpResultStub.resolves({ Id: 'MockId' });

        await StartCommand.run(['-p=testProject', '-b=testBranch']);

        const cache = await DeployPipelineCache.create();
        const key = cache.getLatestKeyOrThrow();
        expect(key).not.to.be.undefined;
      });
  });

  describe('request promotion', () => {
    const firstStageId = 'mock-first-stage-id';
    const secondStageId = 'mock-second-stage-id';

    let monitorStub: sinon.SinonStub;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      monitorStub = sandbox
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .stub(AsyncOpStreaming.prototype, 'monitor' as any)
        .returns({ completed: true, payload: {} });
      esmockFetchAsyncOpResultStub.resolves({
        Id: 'MockId',
        sf_devops__Status__c: AsyncOperationStatus.Completed,
      });
    });

    test
      .stdout()
      .stderr()
      .it('correctly sets the promote option to perfome an undeployedOnly promotion', async () => {
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

        await StartCommand.run(['-p=testProject', '-b=testBranch']);

        expect(requestMock.called).to.equal(true);
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"undeployedOnly":true');
      });

    test
      .stdout()
      .stderr()
      .it('correctly builds the promote options passed using flags', async () => {
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

        await StartCommand.run([
          '-p=testProject',
          '-b=testBranch',
          '-a',
          '-l=RunSpecifiedTests',
          '-t=DummyTest_1,DummyTest_2,DummyTest_3',
          '-v=DummyChangeBundleName',
        ]);

        expect(requestMock.called).to.equal(true);
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"fullDeploy":true');
        expect(requestArgument.body).to.contain('"testLevel":"RunSpecifiedTests"');
        expect(requestArgument.body).to.contain('"runTests":"DummyTest_1,DummyTest_2,DummyTest_3"');
        expect(requestArgument.body).to.contain('"changeBundleName":"DummyChangeBundleName"');
      });

    test
      .stdout()
      .stderr()
      .it('correctly sets the test level as deault when no test level is provided by the user', async () => {
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

        await StartCommand.run(['-p=testProject', '-b=testBranch']);

        expect(requestMock.called).to.equal(true);
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"testLevel":"Default"');
      });

    test
      .stdout()
      .stderr()
      .it('correctly handles when the async operation inmediately transitions to concluded state', async () => {
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

        await StartCommand.run(['-p=testProject', '-b=testBranch']);

        expect(monitorStub.called).to.equal(false);
        expect(esmockFetchAsyncOpResultStub.called).to.equal(true);
        expect(mockOutputService.printAorStatus.called).to.equal(true);
      });

    describe('compute source stage', () => {
      test
        .stdout()
        .stderr()
        .it(
          'correctly computes the source pipeline stage id when deploying to first stage in the pipeline',
          async () => {
            pipelineStageMock = {
              Id: firstStageId,
              sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
              sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
              sf_devops__Pipeline_Stages__r: undefined,
              Name: 'mock',
              sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
            };
            esmockFetchAndValidateStub.resolves(pipelineStageMock);
            requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

            await StartCommand.run(['-p=testProject', '-b=testBranch']);

            expect(esmockFetchAndValidateStub.called).to.equal(true);
            expect(requestMock.called).to.equal(true);
            const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
            expect(requestArgument.url).to.contain(REST_PROMOTE_BASE_URL);
            const urlParams: string[] = requestArgument.url.split('/');
            expect(urlParams[urlParams.length - 1]).to.equal('Approved');
          }
        );

      test
        .stdout()
        .stderr()
        .it(
          'correctly computes the source pipeline stage id when deploying to the second stage in the pipeline',
          async () => {
            pipelineStageMock = {
              Id: secondStageId,
              sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
              sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
              Name: 'mock',
              sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
              sf_devops__Pipeline_Stages__r: {
                records: [
                  {
                    Id: firstStageId,
                    sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
                    sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
                    Name: 'mock',
                    sf_devops__Environment__r: {
                      Id: 'envId',
                      Name: 'envName',
                      sf_devops__Named_Credential__c: 'ABC',
                    },
                  },
                ],
              },
            };
            esmockFetchAndValidateStub.resolves(pipelineStageMock);
            requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

            await StartCommand.run(['-p=testProject', '-b=testBranch']);

            expect(esmockFetchAndValidateStub.called).to.equal(true);
            expect(requestMock.called).to.equal(true);
            const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
            expect(requestArgument.url).to.contain(REST_PROMOTE_BASE_URL);
            const urlParams: string[] = requestArgument.url.split('/');
            expect(urlParams[urlParams.length - 1]).to.equal(firstStageId);
          }
        );
    });

    describe('retry promotion request on 409 error', () => {
      const mockError = new Error();

      beforeEach(() => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: { sf_devops__Name__c: 'mockBranchName' },
          sf_devops__Pipeline__r: { sf_devops__Project__c: 'mockProjectId' },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: { Id: 'envId', Name: 'envName', sf_devops__Named_Credential__c: 'ABC' },
        };
        esmockFetchAndValidateStub.resolves(pipelineStageMock);
      });

      test
        .stdout()
        .stderr()
        .it('succeeds the request after first request', async (ctx) => {
          requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });

          await StartCommand.run(['-p=testProject', '-b=testBranch']);

          expect(requestMock.callCount).to.equal(1);
          expect(ctx.stdout).to.contain('mock-aor-id');
          sinon.assert.notCalled(esmockSleepStub);
        });

      test
        .stdout()
        .stderr()
        .it('retries the request when the http response code is 409', async (ctx) => {
          mockError.message = 'CONFLICT';
          mockError['errorCode'] = 'CONFLICT';
          requestMock = sinon.stub().throws(mockError);

          try {
            await StartCommand.run(['-p=testProject', '-b=testBranch']);
          } catch (e) {
            // expected
          }

          expect(requestMock.callCount).to.equal(51);
          expect(ctx.stderr).to.contain('CONFLICT');
          sinon.assert.callCount(esmockSleepStub, 50);
          sinon.assert.alwaysCalledWith(esmockSleepStub, 2000);
        });

      test
        .stdout()
        .stderr()
        .it('fails the request when the http response code is some non-409 error', async (ctx) => {
          mockError.message = 'ERROR';
          mockError['errorCode'] = 'ERROR';
          requestMock = sinon.stub().throws(mockError);

          try {
            await StartCommand.run(['-p=testProject', '-b=testBranch']);
          } catch (e) {
            // expected
          }

          expect(requestMock.called).to.equal(true);
          expect(ctx.stderr).to.contain('ERROR');
          sinon.assert.notCalled(esmockSleepStub);
        });

      test
        .stdout()
        .stderr()
        .it('succeeds the request after few retries', async (ctx) => {
          mockError.message = 'CONFLICT';
          mockError['errorCode'] = 'CONFLICT';
          requestMock = sinon.stub().throws(mockError);
          requestMock.onCall(4).resolves({ jobId: 'mock-aor-id' });

          await StartCommand.run(['-p=testProject', '-b=testBranch']);

          expect(requestMock.callCount).to.equal(5);
          expect(ctx.stdout).to.contain('mock-aor-id');
          sinon.assert.callCount(esmockSleepStub, 4);
          sinon.assert.alwaysCalledWith(esmockSleepStub, 2000);
        });
    });
  });
});
