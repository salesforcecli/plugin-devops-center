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
import { ConfigVars } from '../../../../src/configMeta';
import * as AorSelector from '../../../../src/common/selectors/asyncOperationResultsSelector';
import { AsyncOperationResult, AsyncOperationStatus } from '../../../../src/common/types';
// import * as asyncOpStreaming from '../../../../src/streamer/processors/asyncOpStream';

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getConnection() {
    return {};
  },
};

describe('deploy pipeline resume', () => {
  let sandbox: sinon.SinonSandbox;
  const mockCache = {};
  let mockAorRecord: AsyncOperationResult;
  const mockAorId = 'a00DS00000Aj3AIYAZ';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validate target-devops-center flag', () => {
    const $$ = new TestContext();

    beforeEach(() => {
      sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
        value: undefined,
        key: ConfigVars.TARGET_DEVOPS_CENTER,
        isLocal: () => false,
        isGlobal: () => true,
        isEnvVar: () => false,
      });
      $$.setConfigStubContents('DeployPipelineCache', mockCache);
    });

    test
      .stdout()
      .stderr()
      .command(['deploy pipeline resume'])
      .it('runs deploy pipeline resume without specifying any target Devops Center org', (ctx) => {
        expect(ctx.stderr).to.contain(
          'You must specify the DevOps Center org username by indicating the -c flag on the command line or by setting the target-devops-center configuration variable.'
        );
      });
  });

  describe('validate flags', () => {
    beforeEach(() => {
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

    test
      .stdout()
      .stderr()
      .command(['deploy pipeline resume'])
      .it('runs deploy pipeline resume without any fo the required flags', (ctx) => {
        // eslint-disable-next-line no-console
        console.log(ctx.stderr);
        expect(ctx.stderr).to.contain('Exactly one of the following must be provided: --job-id, --use-most-recent');
      });

    test
      .stdout()
      .stderr()
      .command(['deploy pipeline resume', '-r', `-i=${mockAorId}`])
      .it('runs deploy pipeline resume specifying both -r and -i flags', (ctx) => {
        expect(ctx.stderr).to.contain('--job-id cannot also be provided when using --use-most-recent');
        expect(ctx.stderr).to.contain('--use-most-recent cannot also be provided when using --job-id');
      });

    test
      .stdout()
      .stderr()
      .command(['deploy pipeline resume', '-r'])
      .it('runs deploy pipeline resume specifying -r when there are no Ids in cache', (ctx) => {
        expect(ctx.stderr).to.contain('No job ID could be found. Verify that a pipeline promotion has been started');
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        mockAorRecord = {
          Id: mockAorId,
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.Error,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        sandbox.stub(AorSelector, 'selectAsyncOperationResultById').resolves(mockAorRecord);
      })
      .command(['deploy pipeline resume', `-i=${mockAorId}`])
      .it('fails because the async job is not resumable due to error state', (ctx) => {
        expect(ctx.stderr).to.contain(
          `Job ID ${mockAorId} is not resumable with status ${mockAorRecord.sf_devops__Status__c}.`
        );
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        mockAorRecord = {
          Id: mockAorId,
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.InProgress,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        sandbox.stub(AorSelector, 'selectAsyncOperationResultById').resolves(mockAorRecord);
      })
      .command(['deploy pipeline resume', `-i=${mockAorId}`])
      .it('fails because the async job is not resumable due to error state', (ctx) => {
        // expect(ctx.stderr).to.contain(`Job ID ${mockAorId} is not resumable with status ${mockAorRecord.sf_devops__Status__c}.`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        // const classStubbedInstance = Sinon.createStubInstance(asyncOpStreaming.AsyncOpStreaming);
        // const constructorStub = Sinon.stub(asyncOpStreaming, 'AsyncOpStreaming').returns(classStubbedInstance);
        // // verify we made the request
        // expect(requestMock.called).to.equal(true);
        // // now that we know the request was made
        // // we can get the call argument
        // // and validate its values
        // const requestArgument = requestMock.getCall(0).args[0] as HttpRequest;
        // expect(requestArgument.body).to.contain('"fullDeploy":true');
        // expect(requestArgument.body).to.contain('"testLevel":"RunSpecifiedTests"');
        // expect(requestArgument.body).to.contain('"runTests":"DummyTest_1,DummyTest_2,DummyTest_3"');
        // expect(requestArgument.body).to.contain('"changeBundleName":"DummyChangeBundleName"');
      });
  });
});
