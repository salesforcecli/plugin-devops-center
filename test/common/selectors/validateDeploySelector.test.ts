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
import * as selector from '../../../src/common/selectors/validateDeploySelector';
import * as SelectorUtils from '../../../src/common/selectors/selectorUtils';

const MOCK_RECORD = {
  records: [
    {
      sf_devops__Change_Bundle__r: {
        Id: 'a047g000003sJsEAAU',
        sf_devops__Version_Name__c: 'v1',
      },
      sf_devops__Environment__r: {
        Id: 'a087g0000083gOlAAI',
      },
    },
  ],
  totalSize: 1,
  done: true,
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
    mockConnection.query.resolves(mockRecord);

    const runSafeQuerySpy = sandbox.spy(SelectorUtils, 'runSafeQuery');

    const aorId = 'mock-id';

    const result = await selector.selectValidateDeployAORSummaryDataById(mockConnection, 'mock-id');

    expect(runSafeQuerySpy.called).to.equal(true);

    // verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result).to.equal(mockRecord.records);

    // verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Change_Bundle_Install__c');
    // verify we queried the correct fields
    expect(builderArgs[0]).to.contain(
      `WHERE sf_devops__Deployment_Result__r.sf_devops__Check_Deploy_Status__c = '${aorId}'`
    );
    expect(builderArgs[0]).to.contain('sf_devops__Change_Bundle__r.Id');
    expect(builderArgs[0]).to.contain('sf_devops__Change_Bundle__r.sf_devops__Version_Name__c');
    expect(builderArgs[0]).to.contain('sf_devops__Environment__r.Id');
  });
});
