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
import * as sinon from 'sinon';
import { ConfigAggregator, Org } from '@salesforce/core';
import { ConfigVars } from '../../../../../src/configMeta.js';
import { AsyncOperationResult, AsyncOperationStatus } from '../../../../../src/common/types.js';
import AsyncOpStreaming from '../../../../../src/streamer/processors/asyncOpStream.js';
import { getAsyncOperationStreamer as realGetAsyncOperationStreamer } from '../../../../../src/common/utils.js';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ResumeCmd: any;
  const mockCache = {};
  let mockAorRecord: AsyncOperationResult;
  const mockAorId = 'a00DS00000Aj3AIYAZ';
  const $$ = new TestContext();

  const fetchAsyncOperationResultStub = sinon.stub();
  const getAsyncOperationStreamerStub = sinon.stub().callsFake(realGetAsyncOperationStreamer);

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
    mockOutputService.printOpSummary.callsFake(() => {
      // eslint-disable-next-line no-console
      console.log('*** Resuming Deployment ***');
    });
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
    const mod = await esmock(
      '../../../../../src/commands/project/deploy/pipeline/resume.js',
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
    ResumeCmd = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchAsyncOperationResultStub.reset();
    getAsyncOperationStreamerStub.resetHistory();
    resetMockOutputService();
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
      .it('runs project deploy pipeline resume without specifying any target Devops Center org', async (ctx) => {
        try {
          await ResumeCmd.run([]);
        } catch (e) {
          // expected
        }
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
      .it('runs project deploy pipeline resume without any of the required flags', async (ctx) => {
        try {
          await ResumeCmd.run([]);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('Exactly one of the following must be provided: --job-id, --use-most-recent');
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline resume specifying both -r and -i flags', async (ctx) => {
        try {
          await ResumeCmd.run(['-r', `-i=${mockAorId}`]);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('--job-id cannot also be provided when using --use-most-recent');
        expect(ctx.stderr).to.contain('--use-most-recent cannot also be provided when using --job-id');
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline resume specifying -r when there are no Ids in cache', async (ctx) => {
        try {
          await ResumeCmd.run(['-r']);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain("Can't find the job ID. Verify that a pipeline promotion has been started");
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline resume specifying both --verbose and --concise flags', async (ctx) => {
        try {
          await ResumeCmd.run(['-r', '--verbose', '--concise']);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('--verbose=true cannot also be provided when using --concise');
      });
  });

  describe('stream aor status', () => {
    let monitorStub: sinon.SinonStub;
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
      monitorStub?.restore();
    });

    test
      .stdout()
      .stderr()
      .it('fails because the async job is not resumable due to error state', async (ctx) => {
        mockAorRecord = {
          Id: mockAorId,
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.Error,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        fetchAsyncOperationResultStub.resolves(mockAorRecord);

        try {
          await ResumeCmd.run([`-i=${mockAorId}`]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain(
          `Job ID ${mockAorId} is not resumable with status ${mockAorRecord.sf_devops__Status__c}.`
        );
      });

    test
      .stdout()
      .stderr()
      .it('correclty streams the status of the async operation', async (ctx) => {
        mockAorRecord = {
          Id: mockAorId,
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.InProgress,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        fetchAsyncOperationResultStub.resolves(mockAorRecord);
        monitorStub = sinon.stub(AsyncOpStreaming.prototype, 'monitor');

        await ResumeCmd.run([`-i=${mockAorId}`]);

        expect(ctx.stdout).to.contain('*** Resuming Deployment ***');
        expect(ctx.stdout).to.contain(`Job ID: ${mockAorId}`);
        expect(getAsyncOperationStreamerStub.called).to.equal(true);
        const builderArgs = getAsyncOperationStreamerStub.getCall(0).args;
        expect(builderArgs[0]).to.equal(DOCE_ORG);
        expect(builderArgs[1]).to.contain({ quantity: 33, unit: 0 });
        expect(builderArgs[2]).to.equal(mockAorId);
        expect(monitorStub.called).to.equal(true);
      });

    test
      .stdout()
      .stderr()
      .it('calls displayEndResults when deployment is completed', async () => {
        mockAorRecord = {
          Id: mockAorId,
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.InProgress,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        fetchAsyncOperationResultStub.resolves(mockAorRecord);
        monitorStub = sinon.stub(AsyncOpStreaming.prototype, 'monitor');
        mockOutputService.getStatus.returns(AsyncOperationStatus.Completed);

        await ResumeCmd.run([`-i=${mockAorId}`, '--verbose']);

        expect(mockOutputService.displayEndResults.called).to.equal(true);
      });

    test
      .stdout()
      .stderr()
      .it('catches a timeout exception from the monitor service and displays proper error message', async (ctx) => {
        mockAorRecord = {
          Id: mockAorId,
          sf_devops__Message__c: 'mockMessage',
          sf_devops__Status__c: AsyncOperationStatus.InProgress,
          sf_devops__Error_Details__c: 'mockErrorDetail',
        };
        fetchAsyncOperationResultStub.resolves(mockAorRecord);
        monitorStub = sinon
          .stub(AsyncOpStreaming.prototype, 'monitor')
          .throwsException({ name: 'GenericTimeoutError' });

        try {
          await ResumeCmd.run([`-i=${mockAorId}`]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('The command has timed out');
        expect(monitorStub.called).to.equal(true);
      });
  });
});
