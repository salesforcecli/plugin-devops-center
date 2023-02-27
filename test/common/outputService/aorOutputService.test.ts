/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */

import { expect, test } from '@oclif/test';
import { AbstractAorOutputService, AorOutputFlags } from '../../../src/common/outputService/aorOutputService';
import { AsyncOperationResult, AsyncOperationStatus } from '../../../src/common/types';

class AorOutputServiceTest extends AbstractAorOutputService<AorOutputFlags> {
  public constructor() {
    super({}, '');
  }

  // eslint-disable-next-line class-methods-use-this
  public printOpSummary(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

describe('aorOutputService', () => {
  const outputService: AorOutputServiceTest = new AorOutputServiceTest();

  describe('async output', () => {
    test.stdout().it('handles the print of an undefined aor status', (ctx) => {
      const status = undefined;
      const message = 'This should be printed';
      const aor: AsyncOperationResult = {
        Id: 'Id',
        sf_devops__Error_Details__c: undefined,
        sf_devops__Status__c: status,
        sf_devops__Message__c: message,
      };
      outputService.printAorStatus(aor);
      expect(ctx.stdout).to.contain(message);
    });

    test.stdout().it('handles the print of an In Progress aor status', (ctx) => {
      const status = AsyncOperationStatus.InProgress;
      const message = 'This should be printed';
      const aor: AsyncOperationResult = {
        Id: 'Id',
        sf_devops__Error_Details__c: undefined,
        sf_devops__Status__c: status,
        sf_devops__Message__c: message,
      };
      outputService.printAorStatus(aor);
      expect(ctx.stdout).to.contain(message);
    });

    test.stdout().it('handles the print of a Completed aor status', (ctx) => {
      const message = 'Deploy complete.';
      const aor: AsyncOperationResult = {
        Id: 'Id',
        sf_devops__Error_Details__c: undefined,
        sf_devops__Status__c: AsyncOperationStatus.Completed,
        sf_devops__Message__c: message,
      };
      outputService.printAorStatus(aor);
      expect(ctx.stdout).to.contain(message);
    });

    test.stdout().it('handles the print of an Error aor status', (ctx) => {
      const status = AsyncOperationStatus.Error;
      const errorDetails = 'This should be printed';
      const message = 'This should also be printed';
      const aor: AsyncOperationResult = {
        Id: 'Id',
        sf_devops__Error_Details__c: errorDetails,
        sf_devops__Status__c: status,
        sf_devops__Message__c: message,
      };
      outputService.printAorStatus(aor);
      expect(ctx.stdout).to.contain(errorDetails);
      expect(ctx.stdout).to.contain(message);
    });

    test.stdout().it('handles the print of an Error aor status without an error message', (ctx) => {
      const status = AsyncOperationStatus.Error;
      const message = 'This should not be printed';
      const aor: AsyncOperationResult = {
        Id: 'Id',
        sf_devops__Error_Details__c: undefined,
        sf_devops__Status__c: status,
        sf_devops__Message__c: message,
      };
      outputService.printAorStatus(aor);
      expect(ctx.stdout).to.be.empty;
    });
  });
});
