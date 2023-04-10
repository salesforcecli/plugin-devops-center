/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */
import * as sinon from 'sinon';
import { expect, test } from '@oclif/test';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Connection } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { ResumeCommandOutputService } from '../../../src/common/outputService/resumeCommandOutputService';
import { Flags as ResumeFlags } from '../../../src/common/base/abstractResume';
import { DeployComponent } from '../../../src/common';
import * as Utils from '../../../src/common/utils';
import vacuum from '../../helpers/vacuum';

const TEST_OPERATION_TYPE = 'test operation type';

describe('resume output', () => {
  let sandbox: sinon.SinonSandbox;
  let outputService: ResumeCommandOutputService;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  test.stdout().it('prints the operation summary correctly', async (ctx) => {
    outputService = getOutputService(false, false);
    outputService.printOpSummary();
    expect(ctx.stdout).to.contain('*** Resuming test operation type ***');
  });

  test.stdout().it('prints the AOR Id correctly', async (ctx) => {
    outputService = getOutputService(false, false);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Utils, 'getFormattedDeployComponentsByAyncOpId').resolves(deployedComponents);

    outputService = getOutputService(false, true);
    await outputService.displayEndResults();
    expect(vacuum(ctx.stdout)).to.contain(
      vacuum(`
          === Deployed Source

          Operation Name Type      Path 
          ───────── ──── ───────── ──── 
          add       Foo  ApexClass path 
          add       Bar  ApexClass path  
            `)
    );
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Utils, 'getFormattedDeployComponentsByAyncOpId').resolves(deployedComponents);

    outputService = getOutputService(false, false);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Utils, 'getFormattedDeployComponentsByAyncOpId').resolves(deployedComponents);

    outputService = getOutputService(true, false);
    await outputService.displayEndResults();
    expect(ctx.stdout).to.not.contain('=== Deployed Source');
  });

  function getOutputService(conciseFlag: boolean, verboseFlag: boolean): ResumeCommandOutputService {
    return new ResumeCommandOutputService(
      buildResumeFlags(conciseFlag, verboseFlag),
      TEST_OPERATION_TYPE,
      sinon.createStubInstance(Connection)
    );
  }

  function buildResumeFlags(conciseFlag: boolean, verboseFlag: boolean): ResumeFlags<typeof SfCommand> {
    return {
      concise: conciseFlag,
      'devops-center-username': undefined,
      'job-id': undefined,
      'use-most-recent': true,
      verbose: verboseFlag,
      wait: Duration.minutes(4),
      json: false,
    };
  }
});
