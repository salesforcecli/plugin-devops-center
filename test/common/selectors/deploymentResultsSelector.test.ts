/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable camelcase */
import { expect } from '@oclif/test';
import * as sinon from 'sinon';
import { Connection } from '@salesforce/core';
import * as selector from '../../../src/common/selectors/deploymentResultsSelector';
import { AsyncOperationStatus } from '../../../src/common';
import * as SelectorUtils from '../../../src/common/selectors/selectorUtils';

const mockAorId = 'mock-id';

const MOCK_RECORD = {
  done: true,
  records: [
    {
      sf_devops__Full_Deploy__c: false,
      sf_devops__Check_Deploy__c: false,
      sf_devops__Test_Level__c: 'mock-test-level',
      sf_devops__Run_Tests__c: 'mock-tests',
      sf_devops__Status__r: {
        Id: mockAorId,
        sf_devops__Message__c: 'mock-message',
        sf_devops__Status__c: AsyncOperationStatus.Completed,
      },
    },
  ],
  totalSize: 1,
};

describe('DeploymentResult selector', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('uses the connection to fetch the record', async () => {
    const mockRecord = MOCK_RECORD;
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves(mockRecord);

    const runSafeQuerySpy = sandbox.spy(SelectorUtils, 'runSafeQuery');

    const result = await selector.selectOneDeploymentResultByAsyncJobId(mockConnection, 'mock-id');

    expect(runSafeQuerySpy.called).to.equal(true);

    // verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result).to.equal(mockRecord.records[0]);

    // verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Deployment_Result__c');
    // verify we queried the correct fields
    expect(builderArgs[0]).to.contain(
      'sf_devops__Full_Deploy__c, sf_devops__Check_Deploy__c, sf_devops__Test_Level__c, sf_devops__Run_Tests__c, sf_devops__Completion_Date__c'
    );
    expect(builderArgs[0]).to.contain(
      'sf_devops__Status__r.Id, sf_devops__Status__r.CreatedDate, sf_devops__Status__r.CreatedById'
    );
    expect(builderArgs[0]).to.contain(
      'sf_devops__Status__r.CreatedBy.Name, sf_devops__Status__r.sf_devops__Message__c'
    );
    expect(builderArgs[0]).to.contain(
      'sf_devops__Status__r.sf_devops__Status__c, sf_devops__Status__r.sf_devops__Error_Details__c'
    );
    // verify we used the correct filter
    expect(builderArgs[0]).to.contain(`WHERE sf_devops__Status__r.Id = '${mockAorId}'`);
  });
});
