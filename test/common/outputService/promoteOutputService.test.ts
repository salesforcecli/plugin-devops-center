/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */

import { expect, test } from '@oclif/test';
import * as sinon from 'sinon';
import { Org } from '@salesforce/core';
import { AbstractPromoteOutputService } from '../../../src/common/outputService/promoteOutputService';
import { DeploySummaryBuilder } from '../../../src/common/outputService/deploySummaryBuilder';

class PromoteOutputServiceTest extends AbstractPromoteOutputService {}

describe('promoteOutputService', () => {
  let sandbox: sinon.SinonSandbox;
  const stubOrg = sinon.createStubInstance(Org);

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('async output', () => {
    const summaryBuilder: DeploySummaryBuilder = new DeploySummaryBuilder(stubOrg.getConnection());
    const outputService: PromoteOutputServiceTest = new PromoteOutputServiceTest(
      {
        async: true,
      },
      summaryBuilder
    );

    test.stdout().it('prints the async deploy execution correctly', async (ctx) => {
      const mockId = 'ABC';
      outputService.setAorId(mockId);
      await outputService.printOpSummary();
      expect(ctx.stdout).to.contain('Deploy has been queued.');
      expect(ctx.stdout).to.contain(`Run "sf deploy pipeline resume --job-id ${mockId} to resume watching the deploy.`);
      expect(ctx.stdout).to.contain(`Run "sf deploy pipeline report --job-id ${mockId} to get the latest status.`);
    });
  });
});
