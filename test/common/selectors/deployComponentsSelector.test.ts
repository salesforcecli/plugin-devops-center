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
import {
  selectDeployComponentsByAsyncOpId,
  selectDeployComponentsForCheckDeployByAsynchOpId,
} from '../../../src/common/selectors/deployComponentsSelector';
import { DeployComponent } from '../../../src/common/types';
import * as SelectorUtils from '../../../src/common/selectors/selectorUtils';

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

  it('uses the connection to fetch the records (selectDeployComponentsByAsyncOpId)', async () => {
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves({
      done: true,
      records: [MOCK_DEPLOY_COMPONENT],
      totalSize: 1,
    });

    const runSafeQuerySpy = sandbox.spy(SelectorUtils, 'runSafeQuery');

    const result = await selectDeployComponentsByAsyncOpId(mockConnection, 'ABC');

    // Verify we call the correct method
    expect(runSafeQuerySpy.called).to.equal(true);

    // Verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result[0]).to.deep.equal(MOCK_DEPLOY_COMPONENT);

    expect(result[0].Name).to.deep.equal(undefined);
    expect(result[0].Type).to.deep.equal(undefined);

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

  it('uses the connection to fetch the records (selectDeployComponentsForCheckDeployByAsynchOpId)', async () => {
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves({
      done: true,
      records: [MOCK_DEPLOY_COMPONENT],
      totalSize: 1,
    });

    const runSafeQuerySpy = sandbox.spy(SelectorUtils, 'runSafeQuery');

    const result = await selectDeployComponentsForCheckDeployByAsynchOpId(mockConnection, 'ABC');

    // Verify we call the correct method
    expect(runSafeQuerySpy.called).to.equal(true);

    // Verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result[0]).to.deep.equal(MOCK_DEPLOY_COMPONENT);

    expect(result[0].Name).to.deep.equal(undefined);
    expect(result[0].Type).to.deep.equal(undefined);

    // Verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Deploy_Component__c ');

    // Verify we queried the correct fields
    expect(builderArgs[0]).to.contain(
      'sf_devops__Source_Component__c, sf_devops__Operation__c, sf_devops__File_Path__c'
    );

    // Verify we used the correct filter
    expect(builderArgs[0]).to.contain(
      "WHERE sf_devops__Deployment_Result__r.sf_devops__Check_Deploy_Status__c = 'ABC'"
    );
  });
});
