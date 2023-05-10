/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */
import { expect, test } from '@oclif/test';
import { TestContext } from '@salesforce/core/lib/testSetup';
import * as sinon from 'sinon';
import { stubMethod } from '@salesforce/ts-sinon';
import { ConfigAggregator, Org, StreamingClient } from '@salesforce/core';
import { HttpRequest } from 'jsforce';
import { Spinner } from '@salesforce/sf-plugins-core/lib/ux';
import { ConfigVars } from '../../../../../src/configMeta';
import AsyncOpStreaming from '../../../../../src/streamer/processors/asyncOpStream';
import { ApiError, AsyncOperationStatus, PipelineStage } from '../../../../../src/common';
import * as Utils from '../../../../../src/common/utils';
import { REST_PROMOTE_BASE_URL } from '../../../../../src/common/constants';
import { DeployCommandOutputService } from '../../../../../src/common/outputService';
import { DeployPipelineCache } from '../../../../../src/common/deployPipelineCache';
import * as AorSelector from '../../../../../src/common/selectors/asyncOperationResultsSelector';
import { AsyncCommand } from '../../../../../src/common/base/abstractAsyncOperation';

let requestMock: sinon.SinonStub;
let stubDisplayEndResults: sinon.SinonStub;

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
  let fetchAndValidatePipelineStageStub: sinon.SinonStub;
  let pipelineStageMock: PipelineStage;
  let spinnerStartStub: sinon.SinonStub;
  let spinnerStopStub: sinon.SinonStub;
  const $$ = new TestContext();

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
      .command(['project deploy pipeline start', '--branch-name=test'])
      .catch(() => {})
      .it('runs project deploy pipeline start with no provided project name', (ctx) => {
        expect(ctx.stderr).to.contain('Missing required flag devops-center-project-name');
      });

    test
      .stdout()
      .stderr()
      .command(['project deploy pipeline start', '--devops-center-project-name=test'])
      .catch(() => {})
      .it('runs project deploy pipeline start with no provided branch name', (ctx) => {
        expect(ctx.stderr).to.contain('Missing required flag branch-name');
      });

    test
      .stdout()
      .stderr()
      .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests'])
      .catch(() => {})
      .it(
        'runs project deploy pipeline start with test level RunSpecifiedTests but does not indicate specific tests with flag -t',
        (ctx) => {
          expect(ctx.stderr).to.contain(
            'You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.'
          );
        }
      );

    test
      .stdout()
      .stderr()
      .command([
        'project deploy pipeline start',
        '-p=testProject',
        '-b=testBranch',
        '-l=RunLocalTests',
        '-t=DummyTestClass',
      ])
      .catch(() => {})
      .it(
        'runs project deploy pipeline start indicating specific tests to run but with test level other than RunSpecifiedTests',
        (ctx) => {
          expect(ctx.stderr).to.contain('runTests can be used only with a testLevel of RunSpecifiedTests.');
        }
      );

    test
      .stdout()
      .stderr()
      .do(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        // mock the async operation result
        const aorMock = {
          Id: 'mock-id',
          sf_devops__Status__c: AsyncOperationStatus.Completed,
          sf_devops__Message__c: 'Completed',
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        sandbox.stub(Utils, 'fetchAsyncOperationResult').resolves(aorMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeployCommandOutputService.prototype, 'printOpSummary' as any).returns({});
      })
      .command([
        'project deploy pipeline start',
        '-p=testProject',
        '-b=testBranch',
        '-l=RunSpecifiedTests',
        '-t=DummyTestClass',
      ])
      .it('runs project deploy pipeline start with the correct flags and validation pass', (ctx) => {
        expect(ctx.error).to.be.undefined;
      });

    test
      .do(() => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        sandbox
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .stub(AsyncOpStreaming.prototype, 'monitor' as any)
          .throwsException({ name: 'GenericTimeoutError' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeployCommandOutputService.prototype, 'printOpSummary' as any).returns({});
      })
      .stdout()
      .stderr()
      .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch', '--wait=3'])
      .catch(() => {})
      .it('runs project deploy pipeline start and handles a GenericTimeoutError', (ctx) => {
        expect(ctx.stderr).to.contain(
          'The command has timed out, although it\'s still running. To check the status of the current operation, run "sf project deploy pipeline report".',
          ctx.stderr
        );
      });

    test
      .do(() => {
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeployCommandOutputService.prototype, 'printOpSummary' as any).returns({});

        sandbox.stub(DeployCommandOutputService.prototype, 'getStatus').returns(AsyncOperationStatus.Completed);

        stubDisplayEndResults = sandbox.stub(DeployCommandOutputService.prototype, 'displayEndResults');

        sandbox.stub(Utils, 'fetchAsyncOperationResult').resolves({ Id: 'mock-aor-id' });
      })
      .stdout()
      .stderr()
      .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch', '--wait=3', '--verbose'])
      .it('runs project deploy pipeline start and handles the verbose flag correctly ', () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(stubDisplayEndResults.called).to.equal(true);
      });
  });

  describe('cache', () => {
    test
      .stdout()
      .stderr()
      .do(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        const mockAorRecord = {
          Id: 'mock-aor-id',
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.InProgress,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        sandbox.stub(AorSelector, 'selectAsyncOperationResultById').resolves(mockAorRecord);
      })
      .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch', '--async'])
      .it('caches the aorId when running project deploy pipeline start with the async flag', async () => {
        const cache = await DeployPipelineCache.create();
        const key = cache.getLatestKeyOrThrow();
        expect(key).not.to.be.undefined;
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(DeployCommandOutputService.prototype, 'printOpSummary' as any).returns({});
        sandbox.stub(Utils, 'fetchAsyncOperationResult').resolves({ Id: 'MockId' });
      })
      .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
      .it('caches the aorId when running project deploy pipeline start without the async flag', async () => {
        const cache = await DeployPipelineCache.create();
        const key = cache.getLatestKeyOrThrow();
        expect(key).not.to.be.undefined;
      });
  });

  describe('request promotion', () => {
    const firstStageId = 'mock-first-stage-id';
    const secondStageId = 'mock-second-stage-id';

    beforeEach(() => {
      // Mock the events streaming and the output service
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(AsyncOpStreaming.prototype, 'monitor' as any).returns({ completed: true, payload: {} });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(DeployCommandOutputService.prototype, 'printOpSummary' as any).returns({});
      sandbox.stub(Utils, 'fetchAsyncOperationResult').resolves({ Id: 'MockId' });
    });

    test
      .stdout()
      .stderr()
      .do(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub();
      })
      .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
      .catch(() => {})
      .it('correctly sets the promote option to perfome an undeployedOnly promotion', () => {
        // verify we made the request
        expect(requestMock.called).to.equal(true);
        // now that we know the request was made
        // we can get the call argument
        // and validate its values
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"undeployedOnly":true');
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub();
      })
      .command([
        'project deploy pipeline start',
        '-p=testProject',
        '-b=testBranch',
        '-a',
        '-l=RunSpecifiedTests',
        '-t=DummyTest_1,DummyTest_2,DummyTest_3',
        '-v=DummyChangeBundleName',
      ])
      .catch(() => {})
      .it('correctly builds the promote options passed using flags', () => {
        // verify we made the request
        expect(requestMock.called).to.equal(true);
        // now that we know the request was made
        // we can get the call argument
        // and validate its values
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"fullDeploy":true');
        expect(requestArgument.body).to.contain('"testLevel":"RunSpecifiedTests"');
        expect(requestArgument.body).to.contain('"runTests":"DummyTest_1,DummyTest_2,DummyTest_3"');
        expect(requestArgument.body).to.contain('"changeBundleName":"DummyChangeBundleName"');
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: firstStageId,
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          Name: 'mock',
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub();
      })
      .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
      .catch(() => {})
      .it('correctly sets the test level as deault when no test level is provided by the user', () => {
        // verify we made the request
        expect(requestMock.called).to.equal(true);
        // now that we know the request was made
        // we can get the call argument
        // and validate its values
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"testLevel":"Default"');
      });

    describe('compute source stage', () => {
      test
        .stdout()
        .stderr()
        .do(() => {
          // mock the pipeline stage record
          // this is the first stage on the pipeline stage
          // so it doesn't have previous stage => sf_devops__Pipeline_Stages__r = undefined
          pipelineStageMock = {
            Id: firstStageId,
            sf_devops__Branch__r: {
              sf_devops__Name__c: 'mockBranchName',
            },
            sf_devops__Pipeline__r: {
              sf_devops__Project__c: 'mockProjectId',
            },
            sf_devops__Pipeline_Stages__r: undefined,
            Name: 'mock',
            sf_devops__Environment__r: {
              Id: 'envId',
              Name: 'envName',
              sf_devops__Named_Credential__c: 'ABC',
            },
          };
          fetchAndValidatePipelineStageStub = sandbox
            .stub(Utils, 'fetchAndValidatePipelineStage')
            .resolves(pipelineStageMock);
          requestMock = sinon.stub();
        })
        .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
        .catch(() => {})
        .it('correctly computes the source pipeline stage id when deploying to first stage in the pipeline', () => {
          expect(fetchAndValidatePipelineStageStub.called).to.equal(true);
          // verify we made the request
          expect(requestMock.called).to.equal(true);
          // now that we know the request was made
          // we can get the call argument
          // and validate its values
          const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
          expect(requestArgument.url).to.contain(REST_PROMOTE_BASE_URL);
          const urlParams: string[] = requestArgument.url.split('/');
          // since we are deploy to the first stage in the pipeline
          // the source stage Id = 'Approved'
          expect(urlParams[urlParams.length - 1]).to.equal('Approved');
        });

      test
        .stdout()
        .stderr()
        .do(() => {
          // mock the pipeline stage record
          // this is not the first stage on the pipeline stage
          // so it has a previous stage
          pipelineStageMock = {
            Id: secondStageId,
            sf_devops__Branch__r: {
              sf_devops__Name__c: 'mockBranchName',
            },
            sf_devops__Pipeline__r: {
              sf_devops__Project__c: 'mockProjectId',
            },
            Name: 'mock',
            sf_devops__Environment__r: {
              Id: 'envId',
              Name: 'envName',
              sf_devops__Named_Credential__c: 'ABC',
            },
            sf_devops__Pipeline_Stages__r: {
              records: [
                {
                  Id: firstStageId,
                  sf_devops__Branch__r: {
                    sf_devops__Name__c: 'mockBranchName',
                  },
                  sf_devops__Pipeline__r: {
                    sf_devops__Project__c: 'mockProjectId',
                  },
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
          fetchAndValidatePipelineStageStub = sandbox
            .stub(Utils, 'fetchAndValidatePipelineStage')
            .resolves(pipelineStageMock);
          requestMock = sinon.stub();
        })
        .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
        .catch(() => {})
        .it(
          'correctly computes the source pipeline stage id when deploying to the second stage in the pipeline',
          () => {
            expect(fetchAndValidatePipelineStageStub.called).to.equal(true);
            // verify we made the request
            expect(requestMock.called).to.equal(true);
            // now that we know the request was made
            // we can get the call argument
            // and validate its values
            const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
            expect(requestArgument.url).to.contain(REST_PROMOTE_BASE_URL);
            const urlParams: string[] = requestArgument.url.split('/');
            expect(urlParams[urlParams.length - 1]).to.equal(firstStageId);
          }
        );
    });

    describe('retry promotion request on 409 error', () => {
      beforeEach(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: 'mock-id',
          Name: 'mock',
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
          sf_devops__Environment__r: {
            Id: 'envId',
            Name: 'envName',
            sf_devops__Named_Credential__c: 'ABC',
          },
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
      });

      // Test case: promotion request returns a valid AOR Id the first time so we don't have to retry.
      test
        .stdout()
        .stderr()
        .do(() => {
          requestMock = sinon.stub().resolves({ jobId: 'mock-aor-id' });
        })
        .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
        .it('succeeds the request after first request', (ctx) => {
          // make sure we made the callout one time
          expect(requestMock.callCount).to.equal(1);
          // make sure that we show the returned aor id to the user
          expect(ctx.stdout).to.contain('mock-aor-id');
        });

      describe('409 error', () => {
        const mockError: ApiError = {
          errorCode: 'CONFLICT',
          name: 'CONFLICT',
          message: 'CONFLICT',
          statusCode: 'CONFLICT',
        };

        // Test case: promotion request returns 409 error so we retry the request till it reaches the limit.
        test
          .stdout()
          .stderr()
          .do(() => {
            // throw 409 error
            requestMock = sandbox
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .stub(AsyncCommand.prototype, 'request' as any)
              .throwsException(mockError);
            spinnerStartStub = stubMethod(sandbox, Spinner.prototype, 'start');
            spinnerStopStub = stubMethod(sandbox, Spinner.prototype, 'stop');
          })
          .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
          .catch(() => {})
          .it('retries the request when the http response code is 409', (ctx) => {
            // make sure we retried the maximum amount of times plus the initial requests
            expect(requestMock.callCount).to.equal(51);
            // make sure that we show the error to the user
            expect(ctx.stderr).to.contain('CONFLICT');
            // make sure that we called the spinner and stopped it as well
            expect(spinnerStartStub.called).to.equal(true);
            expect(spinnerStopStub.called).to.equal(true);
          });

        // Test case: Test case: promotion request returns 409 error and after few retries it returns a valid AOR Id.
        test
          .stdout()
          .stderr()
          .do(() => {
            requestMock = sandbox
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .stub(AsyncCommand.prototype, 'request' as any)
              .throwsException(mockError);
            // on the 4th try we want to complete the VCS event processing and return an AOR Id to the user
            requestMock.onCall(4).resolves({ jobId: 'mock-aor-id' });
          })
          .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
          .it('succeeds the request after few retries', (ctx) => {
            // make sure we made the callout the right number of times
            expect(requestMock.callCount).to.equal(5);
            // make sure that we show the returned aor id to the user
            expect(ctx.stdout).to.contain('mock-aor-id');
          });
      });

      describe('different error', () => {
        const mockError: ApiError = {
          errorCode: 'ERROR',
          name: 'ERROR',
          message: 'ERROR',
          statusCode: 'ERROR',
        };

        // Test case: promotion request returns a non-409 error so we don't retry and display the error.
        test
          .stdout()
          .stderr()
          .do(() => {
            requestMock = sandbox
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .stub(AsyncCommand.prototype, 'request' as any)
              .throwsException(mockError);
          })
          .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
          .catch(() => {})
          .it('fails the request when the http response code is some non-409 error', (ctx) => {
            // make sure we tried at least once to get the response
            expect(requestMock.called).to.equal(true);
            // make sure that we show the error to the user
            expect(ctx.stderr).to.contain('ERROR');
          });
      });
    });

    describe('promotion fails', () => {
      const mockError = new Error();
      let errorHandlerMock: sinon.SinonStub;

      test
        .stdout()
        .stderr()
        .do(() => {
          // mock the pipeline stage record
          pipelineStageMock = {
            Id: firstStageId,
            sf_devops__Branch__r: {
              sf_devops__Name__c: 'mockBranchName',
            },
            sf_devops__Pipeline__r: {
              sf_devops__Project__c: 'mockProjectId',
            },
            sf_devops__Pipeline_Stages__r: undefined,
            Name: 'mock',
            sf_devops__Environment__r: {
              Id: 'envId',
              Name: 'envName',
              sf_devops__Named_Credential__c: 'ABC',
            },
          };
          fetchAndValidatePipelineStageStub = sandbox
            .stub(Utils, 'fetchAndValidatePipelineStage')
            .resolves(pipelineStageMock);
          requestMock = sinon.stub().throwsException(mockError);
          errorHandlerMock = sandbox
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .stub(Utils, 'cleanAndGetApiError');
        })
        .command(['project deploy pipeline start', '-p=testProject', '-b=testBranch'])
        .catch(() => {})
        .it('handles a promotion that cause an error', () => {
          // Check that the stubs are called
          expect(requestMock.called).to.equal(true);
          expect(errorHandlerMock.called).to.equal(true);
          // Check that the error is cleaned
          const errorHandlerArgument = errorHandlerMock.getCall(0).args[0] as Error;
          expect(errorHandlerArgument).to.eq(mockError);
        });
    });
  });
});
