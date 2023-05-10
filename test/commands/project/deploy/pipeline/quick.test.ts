/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */
import { expect, test } from '@oclif/test';
import { ConfigAggregator, Org, StreamingClient } from '@salesforce/core';
import { HttpRequest } from 'jsforce';
import * as sinon from 'sinon';
import { QueryResult, Record } from 'jsforce';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { ConfigVars } from '../../../../../src/configMeta';
import { AsyncOperationStatus, PipelineStage } from '../../../../../src/common';
import AsyncOpStreaming from '../../../../../src/streamer/processors/asyncOpStream';
import { DeployPipelineCache } from '../../../../../src/common/deployPipelineCache';
import { REST_PROMOTE_BASE_URL } from '../../../../../src/common/constants';
import { DeployCommandOutputService } from '../../../../../src/common/outputService';
import * as Utils from '../../../../../src/common/utils';

let requestMock: sinon.SinonStub;
let queryStub: sinon.SinonStub;

// Stub output service methods
let printAorIdStub: sinon.SinonStub;
let printOpSummaryStub: sinon.SinonStub;
let displayEndResultsStub: sinon.SinonStub;

// Stub AOR monitor
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
  sf_devops__Branch__r: {
    sf_devops__Name__c: 'branch-name',
  },
  sf_devops__Pipeline__r: {
    sf_devops__Project__c: 'project-name',
  },
  Name: 'Stage',
  sf_devops__Environment__r: {
    Id: 'Dummy env',
    Name: 'envName',
    sf_devops__Named_Credential__c: 'abc',
  },
};

const mockPipelineStage: PipelineStage = {
  Id: '1',
  sf_devops__Branch__r: {
    sf_devops__Name__c: 'branch-name',
  },
  sf_devops__Pipeline__r: {
    sf_devops__Project__c: 'project-name',
  },
  Name: 'main',
  sf_devops__Environment__r: {
    Id: 'Dummy env',
    Name: 'envName',
    sf_devops__Named_Credential__c: 'abc',
  },
  sf_devops__Pipeline_Stages__r: {
    records: [mockPipelineStagePrev],
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

describe('project deploy pipeline quick', () => {
  let sandbox: sinon.SinonSandbox;
  const mockValidatedAorId = 'a00DS00000Aj3AIYAZ';
  const mockReturnedAorId = 'mock-result-aor-id';
  const mockDeploymentId = 'mock-deployment-id';
  const mockEnvironmentId = 'mock-environment-id';
  const $$ = new TestContext();

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
      .command(['project deploy pipeline quick'])
      .catch(() => {})
      .it('runs project deploy pipeline quick without specifying any target Devops Center org', (ctx) => {
        expect(ctx.stderr).to.contain(
          'You must specify the DevOps Center org username by indicating the -c flag on the command line or by setting the target-devops-center configuration variable.'
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
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('validate flags', () => {
      test
        .stdout()
        .stderr()
        .command(['project deploy pipeline quick'])
        .catch(() => {})
        .it('runs project deploy pipeline quick without any of the required flags', (ctx) => {
          expect(ctx.stderr).to.contain('Exactly one of the following must be provided: --job-id, --use-most-recent');
        });

      test
        .stdout()
        .stderr()
        .command(['project deploy pipeline quick', '-r', `-i=${mockValidatedAorId}`])
        .catch(() => {})
        .it('runs project deploy pipeline quick specifying both -r and -i flags', (ctx) => {
          expect(ctx.stderr).to.contain('--job-id cannot also be provided when using --use-most-recent');
          expect(ctx.stderr).to.contain('--use-most-recent cannot also be provided when using --job-id');
        });

      test
        .stdout()
        .stderr()
        .command(['project deploy pipeline quick', '-r'])
        .catch(() => {})
        .it('runs project deploy pipeline quick specifying -r when there are no Ids in cache', (ctx) => {
          expect(ctx.stderr).to.contain("Can't find the job ID. Verify that a pipeline promotion has been started");
        });

      test
        .stdout()
        .stderr()
        .command(['project deploy pipeline quick', '-r', '--verbose', '--concise'])
        .catch(() => {})
        .it('runs project deploy pipeline quick specifying both --verbose and --concise flags', (ctx) => {
          expect(ctx.stderr).to.contain('--verbose=true cannot also be provided when using --concise');
        });
    });

    describe('cache', () => {
      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .it('caches the aorId when running project deploy pipeline quick with the async flag', async () => {
          const cache = await DeployPipelineCache.create();
          const key = cache.getLatestKeyOrThrow();
          expect(key).to.equal(mockReturnedAorId);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`, '--verbose'])
        .it('caches the aorId when running project deploy pipeline quick without the async flag', async () => {
          const cache = await DeployPipelineCache.create();
          const key = cache.getLatestKeyOrThrow();
          expect(key).to.equal(mockReturnedAorId);
        });
    });

    describe('request quick promotion', () => {
      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .it('query the target org to get the deployment id filtering by the provided AOR ID', () => {
          // verify we made the query
          expect(queryStub.called).to.equal(true);
          // verify the query was filtered correctly
          const queryArgument = queryStub.getCall(0).args[0] as string;
          expect(queryArgument).to.contain('FROM sf_devops__Deployment_Result__c');
          expect(queryArgument).to.contain(`WHERE sf_devops__Check_Deploy_Status__c = '${mockValidatedAorId}'`);
          expect(queryArgument).to.contain('sf_devops__Check_Deploy__c = TRUE');
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .it('query the target org to get the pipeline stage Id filtering by environment Id', () => {
          // verify we made the query
          expect(queryStub.called).to.equal(true);
          // verify the query was filtered correctly
          const queryArgument = queryStub.getCall(1).args[0] as string;
          expect(queryArgument).to.contain('FROM sf_devops__Pipeline_Stage__c');
          expect(queryArgument).to.contain(`WHERE sf_devops__Environment__c = '${mockEnvironmentId}'`);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .it('sends a request to initiate a quick promotion', () => {
          // verify we made the request
          expect(requestMock.called).to.equal(true);
          // now that we know the request was made
          // we can get the call argument
          // and validate its values
          const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
          expect(requestArgument.body).to.contain('"testLevel":"Default"');
          expect(requestArgument.body).to.contain(`"deploymentId":"${mockDeploymentId}"`);
          expect(requestArgument.body).to.contain('"undeployedOnly":true');
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .it('correctly computes the source pipeline stage id', () => {
          // verify we made the request
          expect(requestMock.called).to.equal(true);
          // now that we know the request was made
          // we can get the call argument
          // and validate its values
          const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
          expect(requestArgument.url).to.contain(REST_PROMOTE_BASE_URL);
          const urlParams: string[] = requestArgument.url.split('/');
          expect(urlParams[urlParams.length - 1]).to.equal(mockPipelineStagePrev.Id);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .it('prints the correct output messages when verbose flag is not passed', () => {
          verifyOutput(false);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
          sandbox.stub(DeployCommandOutputService.prototype, 'getStatus').returns(AsyncOperationStatus.Completed);
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`, '--verbose'])
        .it('prints the correct output messages when --verbose flag is passed', () => {
          verifyOutput(true);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`, '--async'])
        .it('prints the correct output messages when --async flag is passed', () => {
          verifyOutput(false);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          queryStub = sinon.stub().returns(getQueryResultMock([]));
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .catch(() => {})
        .it('display an error message when we cannot find the deployment result for the given AOR ID', (ctx) => {
          expect(ctx.stderr).to.contain(
            'The job ID is invalid for the quick deployment. Verify that a deployment validation was run, and that you specified the correct job ID. Then try again.'
          );
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          queryStub = sinon.stub().returns(getQueryResultMock([buildDeploymentResult(AsyncOperationStatus.Error)]));
          requestMock = sinon.stub().resolves(mockReturnedAorId);
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .catch(() => {})
        .it('display an error message when the deployment result for the given AOR ID failed', (ctx) => {
          expect(ctx.stderr).to.contain(
            "We can't perform the quick deployment for the specified job ID because the validate-only deployment failed or is still running. If the validate-only deployment failed, fix the issue and re-run it. If the validate-only deployment was successful, try this command again later."
          );
        });
    });

    describe('stream aor status', () => {
      let spyStreamerBuilder: sinon.SinonSpy;

      const mockAorRecord = {
        Id: mockReturnedAorId,
        sf_devops__Message__c: 'mockMessage',
        sf_devops__Status__c: AsyncOperationStatus.InProgress,
        sf_devops__Error_Details__c: 'mockErrorDetail',
      };

      afterEach(() => {
        spyStreamerBuilder?.restore();
        monitorStub?.restore();
      });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          queryStub.onCall(2).resolves(getQueryResultMock([mockAorRecord]));
          requestMock = sinon.stub().resolves(mockReturnedAorId);

          spyStreamerBuilder = sinon.spy(Utils, 'getAsyncOperationStreamer');
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .it('correclty streams the status of the async operation', () => {
          // verify we instanciated the streamer correctly
          expect(spyStreamerBuilder.called).to.equal(true);
          // now we can get the call argument
          // and validate its values
          const builderArgs = spyStreamerBuilder.getCall(0).args;
          expect(builderArgs[0]).to.equal(DOCE_ORG);
          expect(builderArgs[1]).to.contain({ quantity: 33, unit: 0 });
          expect(builderArgs[2]).to.equal(mockReturnedAorId);

          // verify we started monitoring the operation
          expect(monitorStub.called).to.equal(true);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          queryStub.onCall(2).resolves(getQueryResultMock([mockAorRecord]));
          requestMock = sinon.stub().resolves(mockReturnedAorId);

          spyStreamerBuilder = sinon.spy(Utils, 'getAsyncOperationStreamer');
          stubStreamer();
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`, '--async'])
        .it('does not stream the status of the oar when the async flag is passed', () => {
          // verify we didn't instanciate the streamer
          expect(spyStreamerBuilder.called).to.equal(false);
          // verify we didn't start monitoring the operation
          expect(monitorStub.called).to.equal(false);
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          stubQueries();
          queryStub.onCall(2).resolves(getQueryResultMock([mockAorRecord]));
          requestMock = sinon.stub().resolves(mockReturnedAorId);

          // Mock the events streaming and the output service
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);

          monitorStub = sinon
            .stub(AsyncOpStreaming.prototype, 'monitor')
            .throwsException({ name: 'GenericTimeoutError' });
        })
        .command(['project deploy pipeline quick', `-i=${mockValidatedAorId}`])
        .catch(() => {})
        .it('catches a timeout exception from the monitor service and displays proper error message', (ctx) => {
          // verify output error message
          expect(ctx.stderr).to.contain('The command has timed out');
          expect(ctx.stderr).to.contain(
            'To check the status of the current operation, run "sf project deploy pipeline report".',
            ctx.stderr
          );
          expect(monitorStub.called).to.equal(true);
        });
    });

    function getQueryResultMock(result: [Record] | []): QueryResult<Record> {
      return {
        done: true,
        totalSize: result.length,
        records: result,
      };
    }

    function stubStreamer() {
      // Mock the events streaming and the output service
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      monitorStub = sandbox
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .stub(AsyncOpStreaming.prototype, 'monitor' as any)
        .returns({ completed: true, payload: {} });

      printAorIdStub = sandbox.stub(DeployCommandOutputService.prototype, 'printAorId');
      printOpSummaryStub = sandbox.stub(DeployCommandOutputService.prototype, 'printOpSummary');
      displayEndResultsStub = sandbox.stub(DeployCommandOutputService.prototype, 'displayEndResults');
    }

    function buildDeploymentResult(status: AsyncOperationStatus): Record {
      return {
        sf_devops__Check_Deploy__c: true,
        sf_devops__Deployment_Id__c: mockDeploymentId,
        sf_devops__Check_Deploy_Status__r: {
          sf_devops__Status__c: status,
        },
        sf_devops__Change_Bundle_Installs__r: {
          records: [{ sf_devops__Environment__c: mockEnvironmentId }],
        },
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
