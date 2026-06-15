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
import { ConfigAggregator, Org, StreamingClient } from '@salesforce/core';
import { HttpRequest } from '@jsforce/jsforce-node';
import * as sinon from 'sinon';
import { QueryResult, Record } from '@jsforce/jsforce-node';
import { TestContext } from '@salesforce/core/testSetup';
import { ConfigVars } from '../../../../../src/configMeta.js';
import { AsyncOperationStatus, PipelineStage } from '../../../../../src/common/index.js';
import AsyncOpStreaming from '../../../../../src/streamer/processors/asyncOpStream.js';
import { DeployPipelineCache } from '../../../../../src/common/deployPipelineCache.js';
import { REST_PROMOTE_BASE_URL } from '../../../../../src/common/constants.js';
import { getAsyncOperationStreamer as realGetAsyncOperationStreamer } from '../../../../../src/common/utils.js';

let requestMock: sinon.SinonStub;
let queryStub: sinon.SinonStub;

let monitorStub: sinon.SinonStub;

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getConnection() {
    return {
      request: requestMock,
      query: queryStub,
      getApiVersion: () => '1',
    };
  },
};

const mockPipelineStagePrev: PipelineStage = {
  Id: '2',
  sf_devops__Branch__r: { sf_devops__Name__c: 'branch-name' },
  sf_devops__Pipeline__r: { sf_devops__Project__c: 'project-name' },
  Name: 'Stage',
  sf_devops__Environment__r: { Id: 'Dummy env', Name: 'envName', sf_devops__Named_Credential__c: 'abc' },
};

const mockPipelineStage: PipelineStage = {
  Id: '1',
  sf_devops__Branch__r: { sf_devops__Name__c: 'branch-name' },
  sf_devops__Pipeline__r: { sf_devops__Project__c: 'project-name' },
  Name: 'main',
  sf_devops__Environment__r: { Id: 'Dummy env', Name: 'envName', sf_devops__Named_Credential__c: 'abc' },
  sf_devops__Pipeline_Stages__r: { records: [mockPipelineStagePrev] },
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

describe('project deploy pipeline quick', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let QuickCommand: any;
  const mockValidatedAorId = 'a00DS00000Aj3AIYAZ';
  const mockReturnedAorId = 'mock-result-aor-id';
  const mockDeploymentId = 'mock-deployment-id';
  const mockEnvironmentId = 'mock-environment-id';
  const $$ = new TestContext();

  const getAsyncOperationStreamerStub = sinon.stub().callsFake(realGetAsyncOperationStreamer);
  const fetchAsyncOperationResultStub = sinon.stub();

  // Mock output service to avoid esmock module-tree duplication issues with prototype stubs
  const printAorIdStub = sinon.stub();
  const printOpSummaryStub = sinon.stub().resolves();
  const displayEndResultsStub = sinon.stub().resolves();
  const getStatusStub = sinon.stub();
  const mockOutputService = {
    setAorId: sinon.stub(),
    printAorId: printAorIdStub,
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
    public forQuickDeployment() {
      return mockOutputService;
    }
    // eslint-disable-next-line class-methods-use-this
    public forResume() {
      return mockOutputService;
    }
  }

  before(async () => {
    const mod = await esmock(
      '../../../../../src/commands/project/deploy/pipeline/quick.js',
      {},
      {
        '../../../../../src/common/utils.js': {
          getAsyncOperationStreamer: getAsyncOperationStreamerStub,
          fetchAsyncOperationResult: fetchAsyncOperationResultStub,
        },
        '../../../../../src/common/outputService/outputServiceFactory.js': {
          OutputServiceFactory: MockOutputServiceFactory,
        },
      }
    );
    QuickCommand = mod.default;
  });

  function resetOutputServiceStubs() {
    printAorIdStub.reset();
    printOpSummaryStub.reset();
    printOpSummaryStub.resolves();
    displayEndResultsStub.reset();
    displayEndResultsStub.resolves();
    getStatusStub.reset();
    mockOutputService.setAorId.reset();
    mockOutputService.printAorStatus.reset();
    getAsyncOperationStreamerStub.resetHistory();
    fetchAsyncOperationResultStub.reset();
  }

  describe('without target-devops-center', () => {
    sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
        value: undefined,
        key: ConfigVars.TARGET_DEVOPS_CENTER,
        isLocal: () => false,
        isGlobal: () => true,
        isEnvVar: () => false,
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline quick without specifying any target Devops Center org', async (ctx) => {
        try {
          await QuickCommand.run([]);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain(
          'Before you run a DevOps Center CLI command, you must first use one of the "org login" commands'
        );
      });
  });

  describe('with target-devops-center', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
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
      resetOutputServiceStubs();
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('validate flags', () => {
      test
        .stdout()
        .stderr()
        .it('runs project deploy pipeline quick without any of the required flags', async (ctx) => {
          try {
            await QuickCommand.run([]);
          } catch (e) {
            /* expected */
          }
          expect(ctx.stderr).to.contain('Exactly one of the following must be provided: --job-id, --use-most-recent');
        });

      test
        .stdout()
        .stderr()
        .it('runs project deploy pipeline quick specifying both -r and -i flags', async (ctx) => {
          try {
            await QuickCommand.run(['-r', `-i=${mockValidatedAorId}`]);
          } catch (e) {
            /* expected */
          }
          expect(ctx.stderr).to.contain('--job-id cannot also be provided when using --use-most-recent');
          expect(ctx.stderr).to.contain('--use-most-recent cannot also be provided when using --job-id');
        });

      test
        .stdout()
        .stderr()
        .it('runs project deploy pipeline quick specifying -r when there are no Ids in cache', async (ctx) => {
          try {
            await QuickCommand.run(['-r']);
          } catch (e) {
            /* expected */
          }
          expect(ctx.stderr).to.contain("Can't find the job ID. Verify that a pipeline promotion has been started");
        });

      test
        .stdout()
        .stderr()
        .it('runs project deploy pipeline quick specifying both --verbose and --concise flags', async (ctx) => {
          try {
            await QuickCommand.run(['-r', '--verbose', '--concise']);
          } catch (e) {
            /* expected */
          }
          expect(ctx.stderr).to.contain('--verbose=true cannot also be provided when using --concise');
        });
    });

    describe('cache', () => {
      test
        .stdout()
        .stderr()
        .it('caches the aorId when running project deploy pipeline quick with the async flag', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.InProgress,
          });

          await QuickCommand.run([`-i=${mockValidatedAorId}`]);

          const cache = await DeployPipelineCache.create();
          const key = cache.getLatestKeyOrThrow();
          expect(key).to.equal(mockReturnedAorId);
        });

      test
        .stdout()
        .stderr()
        .it('caches the aorId when running project deploy pipeline quick without the async flag', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          });

          await QuickCommand.run([`-i=${mockValidatedAorId}`, '--verbose']);

          const cache = await DeployPipelineCache.create();
          const key = cache.getLatestKeyOrThrow();
          expect(key).to.equal(mockReturnedAorId);
        });
    });

    describe('request quick promotion', () => {
      test
        .stdout()
        .stderr()
        .it('query the target org to get the deployment id filtering by the provided AOR ID', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          });
          await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          expect(queryStub.called).to.equal(true);
          const queryArgument = queryStub.getCall(0).args[0] as string;
          expect(queryArgument).to.contain('FROM sf_devops__Deployment_Result__c');
          expect(queryArgument).to.contain(`WHERE sf_devops__Check_Deploy_Status__c = '${mockValidatedAorId}'`);
          expect(queryArgument).to.contain('sf_devops__Check_Deploy__c = TRUE');
        });

      test
        .stdout()
        .stderr()
        .it('query the target org to get the pipeline stage Id filtering by environment Id', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          });
          await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          expect(queryStub.called).to.equal(true);
          const queryArgument = queryStub.getCall(1).args[0] as string;
          expect(queryArgument).to.contain('FROM sf_devops__Pipeline_Stage__c');
          expect(queryArgument).to.contain(`WHERE sf_devops__Environment__c = '${mockEnvironmentId}'`);
        });

      test
        .stdout()
        .stderr()
        .it('sends a request to initiate a quick promotion', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          });
          await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          expect(requestMock.called).to.equal(true);
          const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
          expect(requestArgument.body).to.contain(`"deploymentId":"${mockDeploymentId}"`);
          expect(requestArgument.body).to.contain('"undeployedOnly":true');
        });

      test
        .stdout()
        .stderr()
        .it('correctly computes the source pipeline stage id', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          });
          await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          expect(requestMock.called).to.equal(true);
          const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
          expect(requestArgument.url).to.contain(REST_PROMOTE_BASE_URL);
          const urlParams: string[] = requestArgument.url.split('/');
          expect(urlParams[urlParams.length - 1]).to.equal(mockPipelineStagePrev.Id);
        });

      test
        .stdout()
        .stderr()
        .it('prints the correct output messages when verbose flag is not passed', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          });
          await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          verifyOutput(false);
        });

      test
        .stdout()
        .stderr()
        .it('prints the correct output messages when --verbose flag is passed', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          });
          getStatusStub.returns(AsyncOperationStatus.Completed);
          await QuickCommand.run([`-i=${mockValidatedAorId}`, '--verbose']);
          verifyOutput(true);
        });

      test
        .stdout()
        .stderr()
        .it('prints the correct output messages when --async flag is passed', async () => {
          stubQueries();
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.InProgress,
          });
          await QuickCommand.run([`-i=${mockValidatedAorId}`, '--async']);
          verifyOutput(false);
        });

      test
        .stdout()
        .stderr()
        .it('display an error message when we cannot find the deployment result for the given AOR ID', async (ctx) => {
          queryStub = sinon.stub().returns(getQueryResultMock([]));
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          try {
            await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          } catch (e) {
            /* expected */
          }
          expect(ctx.stderr).to.contain('The job ID is invalid for the quick deployment');
        });

      test
        .stdout()
        .stderr()
        .it('display an error message when the deployment result for the given AOR ID failed', async (ctx) => {
          queryStub = sinon.stub().returns(getQueryResultMock([buildDeploymentResult(AsyncOperationStatus.Error)]));
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          try {
            await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          } catch (e) {
            /* expected */
          }
          expect(ctx.stderr).to.contain("We can't perform the quick deployment for the specified job ID");
        });

      test
        .stdout()
        .stderr()
        .it('display an error message when the deployment result does not have CBIs', async (ctx) => {
          queryStub = sinon.stub().returns(getQueryResultMock([]));
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          try {
            await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          } catch (e) {
            /* expected */
          }
          expect(ctx.stderr).to.contain('The job ID is invalid for the quick deployment');
        });
    });

    describe('stream aor status', () => {
      const mockAorRecord = {
        Id: mockReturnedAorId,
        sf_devops__Message__c: 'mockMessage',
        sf_devops__Status__c: AsyncOperationStatus.InProgress,
        sf_devops__Error_Details__c: 'mockErrorDetail',
      };

      afterEach(() => {
        monitorStub?.restore();
      });

      test
        .stdout()
        .stderr()
        .it('correclty streams the status of the async operation', async () => {
          stubQueries();
          queryStub.onCall(2).resolves(getQueryResultMock([mockAorRecord]));
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.InProgress,
          });

          await QuickCommand.run([`-i=${mockValidatedAorId}`]);

          expect(getAsyncOperationStreamerStub.called).to.equal(true);
          const builderArgs = getAsyncOperationStreamerStub.getCall(0).args;
          expect(builderArgs[0]).to.equal(DOCE_ORG);
          expect(builderArgs[1]).to.contain({ quantity: 33, unit: 0 });
          expect(builderArgs[2]).to.equal(mockReturnedAorId);
          expect(monitorStub.called).to.equal(true);
        });

      test
        .stdout()
        .stderr()
        .it('does not stream the status of the oar when the async flag is passed', async () => {
          stubQueries();
          queryStub.onCall(2).resolves(getQueryResultMock([mockAorRecord]));
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          stubStreamer();
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.InProgress,
          });

          await QuickCommand.run([`-i=${mockValidatedAorId}`, '--async']);

          expect(getAsyncOperationStreamerStub.called).to.equal(false);
          expect(monitorStub.called).to.equal(false);
        });

      test
        .stdout()
        .stderr()
        .it('catches a timeout exception from the monitor service and displays proper error message', async (ctx) => {
          stubQueries();
          queryStub.onCall(2).resolves(getQueryResultMock([mockAorRecord]));
          requestMock = sinon.stub().resolves({ jobId: mockReturnedAorId });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
          monitorStub = sinon
            .stub(AsyncOpStreaming.prototype, 'monitor')
            .throwsException({ name: 'GenericTimeoutError' });
          fetchAsyncOperationResultStub.resolves({
            Id: mockReturnedAorId,
            sf_devops__Status__c: AsyncOperationStatus.InProgress,
          });

          try {
            await QuickCommand.run([`-i=${mockValidatedAorId}`]);
          } catch (e) {
            /* expected */
          }

          expect(ctx.stderr).to.contain('The command has timed out');
          expect(monitorStub.called).to.equal(true);
        });
    });

    function getQueryResultMock(result: [Record] | []): QueryResult<Record> {
      return { done: true, totalSize: result.length, records: result };
    }

    function stubStreamer() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      monitorStub = sandbox
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .stub(AsyncOpStreaming.prototype, 'monitor' as any)
        .returns({ completed: true, payload: {} });
    }

    function buildDeploymentResult(status: AsyncOperationStatus): Record {
      return {
        sf_devops__Check_Deploy__c: true,
        sf_devops__Deployment_Id__c: mockDeploymentId,
        sf_devops__Check_Deploy_Status__r: { sf_devops__Status__c: status },
        sf_devops__Change_Bundle_Installs__r: { records: [{ sf_devops__Environment__c: mockEnvironmentId }] },
      };
    }

    function verifyOutput(expectEndResults: boolean) {
      expect(printAorIdStub.called).to.equal(true);
      expect(printOpSummaryStub.called).to.equal(true);
      expect(displayEndResultsStub.called).to.equal(expectEndResults);
    }

    function stubQueries() {
      queryStub = sinon.stub();
      queryStub.onCall(0).resolves(getQueryResultMock([buildDeploymentResult(AsyncOperationStatus.Completed)]));
      queryStub.onCall(1).resolves(getQueryResultMock([mockPipelineStage]));
      queryStub.returns(getQueryResultMock([{}]));
    }
  });
});
