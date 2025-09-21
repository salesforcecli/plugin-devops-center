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
