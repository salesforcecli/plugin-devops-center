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
import { ConfigAggregator, Org } from '@salesforce/core';
import { ConfigVars } from '../../../../../src/configMeta.js';
import { AsyncOperationStatus, DeploymentResult } from '../../../../../src/common/types.js';

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getConnection() {
    return {};
  },
};

describe('project deploy pipeline report', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ReportCommand: any;
  const mockCache = {};
  let mockDeploymentResult: DeploymentResult;
  const mockAorId = 'a00DS00000Aj3AIYAZ';
  const $$ = new TestContext();

  const selectOneDeploymentResultByAsyncJobIdStub = sinon.stub();

  before(async () => {
    const mod = await esmock(
      '../../../../../src/commands/project/deploy/pipeline/report.js',
      {},
      {
        '../../../../../src/common/selectors/deploymentResultsSelector.js': {
          selectOneDeploymentResultByAsyncJobId: selectOneDeploymentResultByAsyncJobIdStub,
        },
        '@salesforce/core': await import('@salesforce/core'),
      }
    );
    ReportCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    selectOneDeploymentResultByAsyncJobIdStub.reset();
    $$.setConfigStubContents('DeployPipelineCache', mockCache);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validate target-devops-center flag', () => {
    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline report without specifying any target Devops Center org', async (ctx) => {
        sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
          value: undefined,
          key: ConfigVars.TARGET_DEVOPS_CENTER,
          isLocal: () => false,
          isGlobal: () => true,
          isEnvVar: () => false,
        });

        try {
          await ReportCommand.run([]);
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
      .it('runs project deploy pipeline report without any fo the required flags', async (ctx) => {
        try {
          await ReportCommand.run([]);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('Exactly one of the following must be provided: --job-id, --use-most-recent');
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline report specifying both -r and -i flags', async (ctx) => {
        try {
          await ReportCommand.run(['-r', `-i=${mockAorId}`]);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain('--job-id cannot also be provided when using --use-most-recent');
        expect(ctx.stderr).to.contain('--use-most-recent cannot also be provided when using --job-id');
      });

    test
      .stdout()
      .stderr()
      .it('runs project deploy pipeline report specifying -r when there are no Ids in cache', async (ctx) => {
        try {
          await ReportCommand.run(['-r']);
        } catch (e) {
          // expected
        }
        expect(ctx.stderr).to.contain("Can't find the job ID. Verify that a pipeline promotion has been started");
      });
  });

  describe('print operation report', () => {
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
      .it('correctly displays the deploy operation status of a success promotion in table format', async (ctx) => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '2023-03-01T13:56:02.000+0000',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Deployment_Id__c: 'mock-deployment-id',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Message__c: 'Deploy complete',
            sf_devops__Status__c: AsyncOperationStatus.Completed,
            CreatedById: 'mock-user-id',
            CreatedBy: { Name: 'mock-user-name' },
          },
        };
        selectOneDeploymentResultByAsyncJobIdStub.resolves(mockDeploymentResult);

        await ReportCommand.run([`-i=${mockAorId}`]);

        expect(ctx.stdout).to.contain('Deploy Info');
        expect(ctx.stdout).to.contain('CheckDeploy');
        expect(ctx.stdout).to.contain('false');
        expect(ctx.stdout).to.contain('2023-03-01T13:56:02.000+0000');
        expect(ctx.stdout).to.contain('mock-user-id');
        expect(ctx.stdout).to.contain('mock-user-name');
        expect(ctx.stdout).to.contain('mock-deployment-id');
        expect(ctx.stdout).to.contain(mockAorId);
        expect(ctx.stdout).to.contain('Deploy complete');
        expect(ctx.stdout).to.contain('mock-tests');
        expect(ctx.stdout).to.contain('Completed');
        expect(ctx.stdout).to.contain('mock-test-level');
      });

    test
      .stdout()
      .stderr()
      .it('correctly displays the deploy operation status of a failed promotion in table format', async (ctx) => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Deployment_Id__c: 'mock-deployment-id',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Error_Details__c: 'mock-error-details',
            sf_devops__Message__c: 'mock-fail-message',
            sf_devops__Status__c: AsyncOperationStatus.Error,
            CreatedById: 'mock-user-id',
            CreatedBy: { Name: 'mock-user-name' },
          },
        };
        selectOneDeploymentResultByAsyncJobIdStub.resolves(mockDeploymentResult);

        await ReportCommand.run([`-i=${mockAorId}`]);

        expect(ctx.stdout).to.contain('Deploy Info');
        expect(ctx.stdout).to.contain('CheckDeploy');
        expect(ctx.stdout).to.contain('mock-user-id');
        expect(ctx.stdout).to.contain('mock-user-name');
        expect(ctx.stdout).to.contain('mock-deployment-id');
        expect(ctx.stdout).to.contain('mock-error-details');
        expect(ctx.stdout).to.contain(mockAorId);
        expect(ctx.stdout).to.contain('mock-fail-message');
        expect(ctx.stdout).to.contain('mock-tests');
        expect(ctx.stdout).to.contain('Error');
        expect(ctx.stdout).to.contain('mock-test-level');
      });

    test
      .stdout()
      .stderr()
      .it('correctly displays the deploy operation status of an In Progress promotion in table format', async (ctx) => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Deployment_Id__c: 'mock-deployment-id',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Message__c: 'mock-message',
            sf_devops__Status__c: AsyncOperationStatus.InProgress,
            CreatedById: 'mock-user-id',
            CreatedBy: { Name: 'mock-user-name' },
          },
        };
        selectOneDeploymentResultByAsyncJobIdStub.resolves(mockDeploymentResult);

        await ReportCommand.run([`-i=${mockAorId}`]);

        expect(ctx.stdout).to.contain('Deploy Info');
        expect(ctx.stdout).to.contain('CheckDeploy');
        expect(ctx.stdout).to.contain('mock-user-id');
        expect(ctx.stdout).to.contain('mock-user-name');
        expect(ctx.stdout).to.contain('mock-deployment-id');
        expect(ctx.stdout).to.contain('a00DS00000Aj3AIYAZ');
        expect(ctx.stdout).to.contain('mock-message');
        expect(ctx.stdout).to.contain('mock-tests');
        expect(ctx.stdout).to.contain('In Progress');
        expect(ctx.stdout).to.contain('mock-test-level');
      });

    test
      .stdout()
      .stderr()
      .it('correctly displays the deploy operation status in json format when --json flag is provided', async (ctx) => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Deployment_Id__c: 'mock-deployment-id',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Message__c: 'mock-message',
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          },
        };
        selectOneDeploymentResultByAsyncJobIdStub.resolves(mockDeploymentResult);

        await ReportCommand.run([`-i=${mockAorId}`, '--json']);

        const jsonOutput = JSON.parse(ctx.stdout);
        expect(jsonOutput.result.jobId).to.equal('a00DS00000Aj3AIYAZ');
        expect(jsonOutput.result.status).to.equal('Completed');
        expect(jsonOutput.result.message).to.equal('mock-message');
      });

    test
      .stdout()
      .stderr()
      .it('displays an error message when the query throws an error', async (ctx) => {
        selectOneDeploymentResultByAsyncJobIdStub.throwsException({
          name: 'AnyError',
          message: 'AnyErrorMessage',
        });

        try {
          await ReportCommand.run([`-i=${mockAorId}`]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contains('AnyErrorMessage');
      });

    test
      .stdout()
      .stderr()
      .it('displays an error message when we can not find a deployment result for the given aorId', async (ctx) => {
        selectOneDeploymentResultByAsyncJobIdStub.resolves(null);

        try {
          await ReportCommand.run([`-i=${mockAorId}`]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contains(`No job found for ID: ${mockAorId}.`);
      });

    test
      .stdout()
      .stderr()
      .it('displays an error message when we get an unexpected error', async (ctx) => {
        selectOneDeploymentResultByAsyncJobIdStub.throws({ message: 'unexpected error' });

        try {
          await ReportCommand.run([`-i=${mockAorId}`]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contains('unexpected error');
      });
  });
});
