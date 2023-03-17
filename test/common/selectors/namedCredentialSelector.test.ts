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
import { selectNamedCredentialByName } from '../../../src/common/selectors/namedCredentialSelector';
import { NamedCredential } from '../../../src/common/types';
import * as SelectorUtils from '../../../src/common/selectors/selectorUtils';

const MOCK_NAMED_CREDENTIAL: NamedCredential = {
  Endpoint: 'www.example.com',
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
      records: [MOCK_NAMED_CREDENTIAL],
      totalSize: 1,
    });

    const runSafeQuerySpy = sandbox.spy(SelectorUtils, 'runSafeQuery');

    const result = await selectNamedCredentialByName(mockConnection, 'ABC');

    expect(runSafeQuerySpy.called).to.equal(true);

    // Verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result).to.equal(MOCK_NAMED_CREDENTIAL);

    // Verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM NamedCredential');

    // Verify we queried the correct fields
    expect(builderArgs[0]).to.contain('Endpoint');

    // Verify we used the correct filter
    expect(builderArgs[0]).to.contain("DeveloperName = 'ABC'");
    expect(builderArgs[0]).to.contain("NamespacePrefix = 'sf_devops'");
  });
});
