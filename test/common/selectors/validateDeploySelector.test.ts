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
