/*
 * Copyright 2025, Salesforce, Inc.
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

import { expect, test } from '@oclif/test';
import { Messages } from '@salesforce/core';
import { AbstractAorOutputService, AorOutputFlags } from '../../../src/common/outputService';
import { AsyncOperationResult, AsyncOperationStatus } from '../../../src/common/types';

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'aorOperations.output');

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

    test.stdout().it('handles the print of an In Progress aor status when the message is valid', (ctx) => {
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

    test.stdout().it('handles the print of an In Progress aor status when the message is undefined', (ctx) => {
      const status = AsyncOperationStatus.InProgress;
      const aor: AsyncOperationResult = {
        Id: 'Id',
        sf_devops__Error_Details__c: undefined,
        sf_devops__Status__c: status,
        sf_devops__Message__c: undefined,
      };
      outputService.printAorStatus(aor);
      expect(ctx.stdout).to.not.contain(undefined);
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
      expect(ctx.stdout).to.contain(
        output.getMessage('output.aor-error-status', [aor.sf_devops__Message__c, aor.sf_devops__Error_Details__c])
      );
    });

    test.stdout().it('handles the print of an Error aor status without an error message detail', (ctx) => {
      const status = AsyncOperationStatus.Error;
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
  });
});
