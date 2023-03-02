/*
 * Copyright (c) 2023, salesforce.com, inc.
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
import * as DeploymentResultSelector from '../../../../src/common/selectors/deploymentResultsSelector';
import { AsyncOperationStatus, DeploymentResult } from '../../../../src/common/types';
import vacuum from '../../../hepers/vacuum';

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getConnection() {
    return {};
  },
};

describe('deploy pipeline report', () => {
  let sandbox: sinon.SinonSandbox;
  const mockCache = {};
  let mockDeploymentResult: DeploymentResult;
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
    test
      .stdout()
      .stderr()
      .do(() => {
        sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
          value: undefined,
          key: ConfigVars.TARGET_DEVOPS_CENTER,
          isLocal: () => false,
          isGlobal: () => true,
          isEnvVar: () => false,
        });
      })
      .command(['deploy pipeline report'])
      .it('runs deploy pipeline report without specifying any target Devops Center org', (ctx) => {
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

    afterEach(() => {
      sandbox.restore();
    });

    test
      .stdout()
      .stderr()
      .command(['deploy pipeline report'])
      .it('runs deploy pipeline report without any fo the required flags', (ctx) => {
        expect(ctx.stderr).to.contain('Exactly one of the following must be provided: --job-id, --use-most-recent');
      });

    test
      .stdout()
      .stderr()
      .command(['deploy pipeline report', '-r', `-i=${mockAorId}`])
      .it('runs deploy pipeline report specifying both -r and -i flags', (ctx) => {
        expect(ctx.stderr).to.contain('--job-id cannot also be provided when using --use-most-recent');
        expect(ctx.stderr).to.contain('--use-most-recent cannot also be provided when using --job-id');
      });

    test
      .stdout()
      .stderr()
      .command(['deploy pipeline report', '-r'])
      .it('runs deploy pipeline report specifying -r when there are no Ids in cache', (ctx) => {
        expect(ctx.stderr).to.contain('No job ID could be found. Verify that a pipeline promotion has been started');
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
      .do(() => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '2023-03-01T13:56:02.000+0000',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Message__c: 'Deploy complete',
            sf_devops__Status__c: AsyncOperationStatus.Completed,
            CreatedById: 'mock-user-id',
            CreatedBy: {
              Name: 'mock-user-name',
            },
          },
        };
        sandbox.stub(DeploymentResultSelector, 'selectOneDeploymentResultByAsyncJobId').resolves(mockDeploymentResult);
      })
      .command(['deploy pipeline report', `-i=${mockAorId}`])
      .it('correctly displays the deploy operation status of a success promotion in table format', (ctx) => {
        expect(vacuum(ctx.stdout)).to.contain(
          vacuum(`
          Deploy Info
          =============================================
          | Key            Value                        
          | ────────────── ──────────────────────────── 
          | CheckDeploy    false                        
          | CompletionDate 2023-03-01T13:56:02.000+0000 
          | CreatedById    mock-user-id                 
          | CreatedByName  mock-user-name               
          | FullDeploy     false                        
          | Id             ${mockAorId}           
          | Message        Deploy complete              
          | RunTests       mock-tests                   
          | Status         Completed                    
          | TestLevel      mock-test-level  
            `)
        );
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Error_Details__c: 'mock-error-details',
            sf_devops__Message__c: 'mock-fail-message',
            sf_devops__Status__c: AsyncOperationStatus.Error,
            CreatedById: 'mock-user-id',
            CreatedBy: {
              Name: 'mock-user-name',
            },
          },
        };
        sandbox.stub(DeploymentResultSelector, 'selectOneDeploymentResultByAsyncJobId').resolves(mockDeploymentResult);
      })
      .command(['deploy pipeline report', `-i=${mockAorId}`])
      .it('correctly displays the deploy operation status of a failed promotion in table format', (ctx) => {
        expect(vacuum(ctx.stdout)).to.contain(
          vacuum(`
          Deploy Info
          ===================================
          | Key            Value              
          | ────────────── ────────────────── 
          | CheckDeploy    false              
          | CompletionDate                    
          | CreatedById    mock-user-id       
          | CreatedByName  mock-user-name     
          | ErrorDetails   mock-error-details 
          | FullDeploy     false              
          | Id             ${mockAorId} 
          | Message        mock-fail-message  
          | RunTests       mock-tests         
          | Status         Error              
          | TestLevel      mock-test-level  
            `)
        );
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Message__c: 'mock-message',
            sf_devops__Status__c: AsyncOperationStatus.InProgress,
            CreatedById: 'mock-user-id',
            CreatedBy: {
              Name: 'mock-user-name',
            },
          },
        };
        sandbox.stub(DeploymentResultSelector, 'selectOneDeploymentResultByAsyncJobId').resolves(mockDeploymentResult);
      })
      .command(['deploy pipeline report', `-i=${mockAorId}`])
      .it('correctly displays the deploy operation status of an In Progress promotion in table format', (ctx) => {
        expect(vacuum(ctx.stdout)).to.contain(
          vacuum(`
            Deploy Info
            ===================================
            | Key            Value              
            | ────────────── ────────────────── 
            | CheckDeploy    false              
            | CompletionDate                    
            | CreatedById    mock-user-id       
            | CreatedByName  mock-user-name     
            | FullDeploy     false              
            | Id             a00DS00000Aj3AIYAZ 
            | Message        mock-message       
            | RunTests       mock-tests         
            | Status         In Progress        
            | TestLevel      mock-test-level  
              `)
        );
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        mockDeploymentResult = {
          sf_devops__Full_Deploy__c: false,
          sf_devops__Completion_Date__c: '',
          sf_devops__Check_Deploy__c: false,
          sf_devops__Test_Level__c: 'mock-test-level',
          sf_devops__Run_Tests__c: 'mock-tests',
          sf_devops__Status__r: {
            Id: mockAorId,
            sf_devops__Message__c: 'mock-message',
            sf_devops__Status__c: AsyncOperationStatus.Completed,
          },
        };
        sandbox.stub(DeploymentResultSelector, 'selectOneDeploymentResultByAsyncJobId').resolves(mockDeploymentResult);
      })
      .command(['deploy pipeline report', `-i=${mockAorId}`, '--json'])
      .it('correctly displays the deploy operation status in json format when --json flag is provided', (ctx) => {
        expect(vacuum(ctx.stdout)).to.contain(
          vacuum(`
            "result": {
              "jobId": "a00DS00000Aj3AIYAZ",
              "status": "Completed",
              "message": "mock-message"
            },
            `)
        );
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        sandbox
          .stub(DeploymentResultSelector, 'selectOneDeploymentResultByAsyncJobId')
          .throwsException({ name: 'SingleRecordQuery_NoRecords' });
      })
      .command(['deploy pipeline report', `-i=${mockAorId}`])
      .it('displays an error message when we can not find a deployment result for the given aorId', (ctx) => {
        expect(ctx.stderr).to.contains(`No job found for ID: ${mockAorId}.`);
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        sandbox
          .stub(DeploymentResultSelector, 'selectOneDeploymentResultByAsyncJobId')
          .throws({ message: 'unexpected error' });
      })
      .command(['deploy pipeline report', `-i=${mockAorId}`])
      .it('displays an error message when we get an unexpected error', (ctx) => {
        expect(ctx.stderr).to.contains('unexpected error');
      });
  });
});
