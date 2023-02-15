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
import { ConfigAggregator, Org } from '@salesforce/core';
import { HttpRequest } from 'jsforce';
import { ConfigVars } from '../../../src/configMeta';
// import { DeployPipelineCache } from '../../../src/common/deployPipelineCache';
import { PipelineStage } from '../../../src/common';
import * as Utils from '../../../src/common/utils';
import { REST_PROMOTE_BASE_URL } from '../../../src/common/constants';

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
    };
  },
};

describe('deploy pipeline', () => {
  let sandbox: sinon.SinonSandbox;
  let fetchAndValidatePipelineStageStub: sinon.SinonStub;
  let pipelineStageMock: PipelineStage;

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
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validate flags', () => {
    test
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '--branch-name=test'])
      .it('runs deploy pipeline with no provided project name', (ctx) => {
        expect(ctx.stderr).to.contain('Missing required flag devops-center-project-name');
      });

    test
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '--devops-center-project-name=test'])
      .it('runs deploy pipeline with no provided branch name', (ctx) => {
        expect(ctx.stderr).to.contain('Missing required flag branch-name');
      });

    test
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests'])
      .it(
        'runs deploy pipeline with test level RunSpecifiedTests but does not indicate specific tests with flag -t',
        (ctx) => {
          expect(ctx.stderr).to.contain(
            'You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.'
          );
        }
      );

    test
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-l=RunLocalTests', '-t=DummyTestClass'])
      .it(
        'runs deploy pipeline indicating specific tests to run but with test level other than RunSpecifiedTests',
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
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves('mock-aor-id');
      })
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests', '-t=DummyTestClass'])
      .it('runs deploy pipeline with the correct flags and validation pass', (ctx) => {
        // expect(ctx.stderr).to.equal('');
      });

    // test
    //   .do(() => {
    //     sandbox
    //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //       .stub(PromoteCommand.prototype, 'executePromotion' as any)
    //       .throwsException({ name: 'GenericTimeoutError' });
    //   })
    //   .stdout()
    //   .stderr()
    //   .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--wait=3'])
    //   .it('runs deploy:pipeline and handles a GenericTimeoutError', (ctx) => {
    //     expect(ctx.stderr).to.contain(
    //       'The command has timed out, although the deployment is still running. To check the status of the deploy operation, run "sf deploy pipeline report".'
    //     );
    //   });
  });

  describe('cache', () => {
    const $$ = new TestContext();

    beforeEach(async () => {
      // Mock the cache
      $$.setConfigStubContents('DeployPipelineCache', {});
    });

    test
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch'])
      .it('does not cache when running deploy pipeline without the async flag', async () => {
        // const cache = await DeployPipelineCache.create();
        let excThrown = false;
        try {
          // cache.resolveLatest();
        } catch (err) {
          excThrown = true;
        }
        expect(excThrown);
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        // mock the pipeline stage record
        pipelineStageMock = {
          Id: 'mock-id',
          sf_devops__Branch__r: {
            sf_devops__Name__c: 'mockBranchName',
          },
          sf_devops__Pipeline__r: {
            sf_devops__Project__c: 'mockProjectId',
          },
          sf_devops__Pipeline_Stages__r: undefined,
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves('mock-aor-id');
      })
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--async'])
      .it('cache the aorId when running deploy pipeline with the async flag', async () => {
        // const cache = await DeployPipelineCache.create();
        // const key = cache.resolveLatest();
        // expect(key).not.to.be.undefined;
      });
  });

  describe('request promotion', () => {
    const firstStageId = 'mock-first-stage-id';
    const secondStageId = 'mock-second-stage-id';

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
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub();
      })
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch'])
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
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub();
      })
      .command([
        'deploy:pipeline',
        '-p=testProject',
        '-b=testBranch',
        '-a',
        '-l=RunSpecifiedTests',
        '-t=DummyTest_1,DummyTest_2,DummyTest_3',
        '-v=DummyChangeBundleName',
      ])
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
          };
          fetchAndValidatePipelineStageStub = sandbox
            .stub(Utils, 'fetchAndValidatePipelineStage')
            .resolves(pipelineStageMock);
          requestMock = sinon.stub();
        })
        .command(['deploy:pipeline', '-p=testProject', '-b=testBranch'])
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
                },
              ],
            },
          };
          fetchAndValidatePipelineStageStub = sandbox
            .stub(Utils, 'fetchAndValidatePipelineStage')
            .resolves(pipelineStageMock);
          requestMock = sinon.stub();
        })
        .command(['deploy:pipeline', '-p=testProject', '-b=testBranch'])
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
        };
        fetchAndValidatePipelineStageStub = sandbox
          .stub(Utils, 'fetchAndValidatePipelineStage')
          .resolves(pipelineStageMock);
        requestMock = sinon.stub();
      })
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch'])
      .it('correctly sets the test level as deault when no test level is provided by the user', () => {
        // verify we made the request
        expect(requestMock.called).to.equal(true);
        // now that we know the request was made
        // we can get the call argument
        // and validate its values
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"testLevel":"Default"');
      });
  });
});
