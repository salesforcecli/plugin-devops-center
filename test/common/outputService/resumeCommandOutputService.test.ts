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
import * as sinon from 'sinon';
import { expect, test } from '@oclif/test';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Connection } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { Flags as ResumeFlags } from '../../../src/common/base/abstractResume.js';
import { DeployComponent } from '../../../src/common/index.js';

const TEST_OPERATION_TYPE = 'test operation type';

describe('resume output', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ResumeCommandOutputServiceClass: any;

  const getFormattedDeployComponentsByAyncOpIdStub = sinon.stub();
  const isCheckDeployStub = sinon.stub();

  before(async () => {
    const mod = await esmock(
      '../../../src/common/outputService/resumeCommandOutputService.js',
      {},
      {
        '../../../src/common/utils.js': {
          getFormattedDeployComponentsByAyncOpId: getFormattedDeployComponentsByAyncOpIdStub,
        },
        '../../../src/common/selectors/deploymentResultsSelector.js': {
          isCheckDeploy: isCheckDeployStub,
        },
      }
    );
    ResumeCommandOutputServiceClass = mod.ResumeCommandOutputService;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    getFormattedDeployComponentsByAyncOpIdStub.reset();
    isCheckDeployStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function getOutputService(conciseFlag: boolean, verboseFlag: boolean) {
    return new ResumeCommandOutputServiceClass(
      buildResumeFlags(conciseFlag, verboseFlag),
      TEST_OPERATION_TYPE,
      sinon.createStubInstance(Connection)
    );
  }

  function buildResumeFlags(conciseFlag: boolean, verboseFlag: boolean): ResumeFlags<typeof SfCommand> {
    return {
      concise: conciseFlag,
      // @ts-expect-error for testing purposes
      'devops-center-username': undefined,
      'job-id': undefined,
      'use-most-recent': true,
      verbose: verboseFlag,
      wait: Duration.minutes(4),
      json: false,
    };
  }

  test.stdout().it('prints the operation summary correctly', async (ctx) => {
    const outputService = getOutputService(false, false);
    outputService.printOpSummary();
    expect(ctx.stdout).to.contain('*** Resuming test operation type ***');
  });

  test.stdout().it('prints the AOR Id correctly', async (ctx) => {
    const outputService = getOutputService(false, false);
    const mockId = 'ABC';
    outputService.setAorId(mockId);
    outputService.printAorId();
    expect(ctx.stdout).to.contain('Job ID: ABC');
  });

  test.stdout().it('prints the deployed components table when verbose flag is provided', async (ctx) => {
    const deployedComponents: DeployComponent[] = [
      {
        sf_devops__Source_Component__c: 'ApexClass:Foo',
        sf_devops__Operation__c: 'add',
        sf_devops__File_Path__c: 'path',
        Type: 'ApexClass',
        Name: 'Foo',
      },
      {
        sf_devops__Source_Component__c: 'ApexClass:Bar',
        sf_devops__Operation__c: 'add',
        sf_devops__File_Path__c: 'path',
        Type: 'ApexClass',
        Name: 'Bar',
      },
    ];

    getFormattedDeployComponentsByAyncOpIdStub.resolves(deployedComponents);
    isCheckDeployStub.resolves(false);

    const outputService = getOutputService(false, true);
    await outputService.displayEndResults();
    expect(ctx.stdout).to.contain('Deployed Source');
    expect(ctx.stdout).to.contain('Foo');
    expect(ctx.stdout).to.contain('Bar');
    expect(ctx.stdout).to.contain('ApexClass');
    expect(ctx.stdout).to.contain('add');
  });

  test
    .stdout()
    .it('prints the deployed components table when verbose flag is provided and is a checkDeploy', async (ctx) => {
      const deployedComponents: DeployComponent[] = [
        {
          sf_devops__Source_Component__c: 'ApexClass:Foo',
          sf_devops__Operation__c: 'add',
          sf_devops__File_Path__c: 'path',
          Type: 'ApexClass',
          Name: 'Foo',
        },
      ];

      getFormattedDeployComponentsByAyncOpIdStub.resolves(deployedComponents);
      isCheckDeployStub.resolves(true);

      const outputService = getOutputService(false, true);
      await outputService.displayEndResults();
      expect(ctx.stdout).to.contain('Validate-only Deployed Source');
      expect(ctx.stdout).to.contain('Foo');
      expect(ctx.stdout).to.contain('ApexClass');
      expect(ctx.stdout).to.contain('add');
    });

  test.stdout().it('does not prints the deployed components table when verbose flag is not provided', async (ctx) => {
    const deployedComponents: DeployComponent[] = [
      {
        sf_devops__Source_Component__c: 'ApexClass:Foo',
        sf_devops__Operation__c: 'add',
        sf_devops__File_Path__c: 'path',
        Type: 'ApexClass',
        Name: 'Foo',
      },
      {
        sf_devops__Source_Component__c: 'ApexClass:Bar',
        sf_devops__Operation__c: 'add',
        sf_devops__File_Path__c: 'path',
        Type: 'ApexClass',
        Name: 'Bar',
      },
    ];

    getFormattedDeployComponentsByAyncOpIdStub.resolves(deployedComponents);

    const outputService = getOutputService(false, false);
    await outputService.displayEndResults();
    expect(ctx.stdout).to.not.contain('=== Deployed Source');
  });

  test.stdout().it('does not prints the deployed components table when concise flag is provided', async (ctx) => {
    const deployedComponents: DeployComponent[] = [
      {
        sf_devops__Source_Component__c: 'ApexClass:Foo',
        sf_devops__Operation__c: 'add',
        sf_devops__File_Path__c: 'path',
        Type: 'ApexClass',
        Name: 'Foo',
      },
      {
        sf_devops__Source_Component__c: 'ApexClass:Bar',
        sf_devops__Operation__c: 'add',
        sf_devops__File_Path__c: 'path',
        Type: 'ApexClass',
        Name: 'Bar',
      },
    ];

    getFormattedDeployComponentsByAyncOpIdStub.resolves(deployedComponents);

    const outputService = getOutputService(true, false);
    await outputService.displayEndResults();
    expect(ctx.stdout).to.not.contain('=== Deployed Source');
  });
});
