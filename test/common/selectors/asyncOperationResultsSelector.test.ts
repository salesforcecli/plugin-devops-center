/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable camelcase */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Connection } from '@salesforce/core';
import * as selector from '../../../src/common/selectors/asyncOperationResultsSelector';
import { AsyncOperationStatus } from '../../../src/common';

const MOCK_RECORD = {
  Id: 'mock-id',
  sf_devops__Message__c: 'mock-message',
  sf_devops__Status__c: AsyncOperationStatus.Completed,
};

describe('AOR selector', () => {
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
    mockConnection.singleRecordQuery.resolves(mockRecord);

    const result = await selector.selectAsyncOperationResultById(mockConnection, 'mock-id');

    // verify we received the correct result
    expect(mockConnection.singleRecordQuery.called).to.equal(true);
    expect(result).to.equal(mockRecord);

    // verify we queried the correct object
    const builderArgs = mockConnection.singleRecordQuery.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Async_Operation_Result__c');
    // verify we queried the correct fields
    expect(builderArgs[0]).to.contain('sf_devops__Status__c');
    expect(builderArgs[0]).to.contain('sf_devops__Message__c');
    expect(builderArgs[0]).to.contain('sf_devops__Error_Details__c');
  });
});
