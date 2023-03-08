/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */

import { expect } from '@oclif/test';
import { Connection } from '@salesforce/core';
import sinon = require('sinon');
import { selectDeployComponentsByAsyncOpId } from '../../../src/common/selectors/deployComponentsSelector';
import { DeployComponent } from '../../../src/common/types';

const MOCK_DEPLOY_COMPONENT: DeployComponent = {
  sf_devops__Source_Component__c: 'apexClass:foo',
  sf_devops__Operation__c: 'ADD',
  sf_devops__File_Path__c: 'path',
};

describe('endpoint selector', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('uses the connection to fetch the records', async () => {
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves({
      done: true,
      records: [MOCK_DEPLOY_COMPONENT],
      totalSize: 1,
    });

    const result = await selectDeployComponentsByAsyncOpId(mockConnection, 'ABC');

    // We verify we add these fields after the query
    MOCK_DEPLOY_COMPONENT.Name = 'foo';
    MOCK_DEPLOY_COMPONENT.Type = 'apexClass';
    // Verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result[0]).to.equal(MOCK_DEPLOY_COMPONENT);

    // Verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Deploy_Component__c ');

    // Verify we queried the correct fields
    expect(builderArgs[0]).to.contain(
      'sf_devops__Source_Component__c, sf_devops__Operation__c, sf_devops__File_Path__c'
    );

    // Verify we used the correct filter
    expect(builderArgs[0]).to.contain("sf_devops__Deployment_Result__r.sf_devops__Status__c = 'ABC'");
  });
});
