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
import { ConfigVars } from '../../../../../src/configMeta';
import * as AorSelector from '../../../../../src/common/selectors/asyncOperationResultsSelector';
import { AsyncOperationResult, AsyncOperationStatus } from '../../../../../src/common/types';
import AsyncOpStreaming from '../../../../../src/streamer/processors/asyncOpStream';
import * as Utils from '../../../../../src/common/utils';
import { ResumeCommandOutputService } from '../../../../../src/common/outputService/resumeCommandOutputService';

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getConnection() {
    return {};
  },
};

describe('project deploy pipeline resume', () => {
  let sandbox: sinon.SinonSandbox;
  const mockCache = {};
  let mockAorRecord: AsyncOperationResult;
  const mockAorId = 'a00DS00000Aj3AIYAZ';
  const $$ = new TestContext();

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    $$.setConfigStubContents('DeployPipelineCache', mockCache);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validate target-devops-center flag', () => {
    beforeEach(() => {
      sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
        value: undefined,
        key: ConfigVars.TARGET_DEVOPS_CENTER,
        isLocal: () => false,
        isGlobal: () => true,
        isEnvVar: () => false,
      });
    });

    test
      .stdout()
      .stderr()
      .command(['project deploy pipeline resume'])
      .catch(() => {})
      .it('runs project deploy pipeline resume without specifying any target Devops Center org', (ctx) => {
        expect(ctx.stderr).to.contain(
          'Before you run a DevOps Center CLI command, you must first use one of the "org login" commands to authorize the org in which DevOps Center is installed. Then, when you run a DevOps Center command, be sure that you specify the DevOps Center org username with the "--devops-center-username" flag. Alternatively, you can set the "target-devops-center" configuration variable to the username with the "config set" command.'
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
      .command(['project deploy pipeline resume'])
      .catch(() => {})
      .it('runs project deploy pipeline resume without any of the required flags', (ctx) => {
        expect(ctx.stderr).to.contain('Exactly one of the following must be provided: --job-id, --use-most-recent');
      });

    test
      .stdout()
      .stderr()
      .command(['project deploy pipeline resume', '-r', `-i=${mockAorId}`])
      .catch(() => {})
      .it('runs project deploy pipeline resume specifying both -r and -i flags', (ctx) => {
        expect(ctx.stderr).to.contain('--job-id cannot also be provided when using --use-most-recent');
        expect(ctx.stderr).to.contain('--use-most-recent cannot also be provided when using --job-id');
      });

    test
      .stdout()
      .stderr()
      .command(['project deploy pipeline resume', '-r'])
      .catch(() => {})
      .it('runs project deploy pipeline resume specifying -r when there are no Ids in cache', (ctx) => {
        expect(ctx.stderr).to.contain("Can't find the job ID. Verify that a pipeline promotion has been started");
      });

    test
      .stdout()
      .stderr()
      .command(['project deploy pipeline resume', '-r', '--verbose', '--concise'])
      .catch(() => {})
      .it('runs project deploy pipeline resume specifying both --verbose and --concise flags', (ctx) => {
        expect(ctx.stderr).to.contain('--verbose=true cannot also be provided when using --concise');
      });
  });

  describe('stream aor status', () => {
    let spyStreamerBuilder: sinon.SinonSpy;
    let monitorStub: sinon.SinonStub;
    let stubDisplayEndResults: sinon.SinonStub;
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

    afterEach(() => {
      spyStreamerBuilder?.restore();
      monitorStub?.restore();
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
      .command(['project deploy pipeline resume', `-i=${mockAorId}`])
      .catch(() => {})
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
        spyStreamerBuilder = sinon.spy(Utils, 'getAsyncOperationStreamer');
        monitorStub = sinon.stub(AsyncOpStreaming.prototype, 'monitor');
      })
      .command(['project deploy pipeline resume', `-i=${mockAorId}`])
      .it('correclty streams the status of the async operation', (ctx) => {
        // verify output
        expect(ctx.stdout).to.contain('*** Resuming Deployment ***');
        expect(ctx.stdout).to.contain(`Job ID: ${mockAorId}`);
        // verify we instanciated the streamer correctly
        expect(spyStreamerBuilder.called).to.equal(true);
        // now we can get the call argument
        // and validate its values
        const builderArgs = spyStreamerBuilder.getCall(0).args;
        expect(builderArgs[0]).to.equal(DOCE_ORG);
        expect(builderArgs[1]).to.contain({ quantity: 33, unit: 0 });
        expect(builderArgs[2]).to.equal(mockAorId);
        expect(monitorStub.called).to.equal(true);
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

        monitorStub = sinon.stub(AsyncOpStreaming.prototype, 'monitor');
        sandbox.stub(ResumeCommandOutputService.prototype, 'getStatus').returns(AsyncOperationStatus.Completed);
        stubDisplayEndResults = sandbox.stub(ResumeCommandOutputService.prototype, 'displayEndResults');
      })
      .command(['project deploy pipeline resume', `-i=${mockAorId}`, '--verbose'])
      .it('calls displayEndResults when deployment is completed', () => {
        // verify we printed the end results message
        expect(stubDisplayEndResults.called).to.equal(true);
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
        monitorStub = sinon
          .stub(AsyncOpStreaming.prototype, 'monitor')
          .throwsException({ name: 'GenericTimeoutError' });
      })
      .command(['project deploy pipeline resume', `-i=${mockAorId}`])
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
});
