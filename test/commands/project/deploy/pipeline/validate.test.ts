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
import { ConfigAggregator, Org, StreamingClient } from '@salesforce/core';
import { HttpRequest } from 'jsforce';
import { ConfigVars } from '../../../../../src/configMeta';
import AsyncOpStreaming from '../../../../../src/streamer/processors/asyncOpStream';
import * as Utils from '../../../../../src/common/utils';
import { DeployCommandOutputService } from '../../../../../src/common/outputService';
import { AsyncOperationStatus, PipelineStage } from '../../../../../src/common';

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

describe('project deploy pipeline validate', () => {
  let sandbox: sinon.SinonSandbox;
  let pipelineStageMock: PipelineStage;
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

  describe('request promotion', () => {
    const firstStageId = 'mock-first-stage-id';

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
        sandbox.stub(Utils, 'fetchAndValidatePipelineStage').resolves(pipelineStageMock);
        requestMock = sinon.stub();
      })
      .command(['project deploy pipeline validate', '-p=testProject', '-b=testBranch'])
      .it('correctly sets the promote option to perfome a checkDeploy promotion', () => {
        // verify we made the request
        expect(requestMock.called).to.equal(true);
        // now that we know the request was made
        // we can get the call argument
        // and validate its values
        const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        expect(requestArgument.body).to.contain('"checkDeploy":true');
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
        sandbox.stub(Utils, 'fetchAndValidatePipelineStage').resolves(pipelineStageMock);
        requestMock = sinon.stub().resolves('MockId');

        sandbox.stub(DeployCommandOutputService.prototype, 'getStatus').returns(AsyncOperationStatus.Completed);

        stubDisplayEndResults = sandbox.stub(DeployCommandOutputService.prototype, 'displayEndResults');
      })
      .stdout()
      .stderr()
      .command(['project deploy pipeline validate', '-p=testProject', '-b=testBranch', '--wait=3', '--verbose'])
      .it('runs project deploy pipeline validate and handles the verbose flag correctly ', () => {
        expect(stubDisplayEndResults.called).to.equal(true);
      });
  });
});
