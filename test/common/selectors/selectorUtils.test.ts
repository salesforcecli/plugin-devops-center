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

import { Connection, Messages } from '@salesforce/core';
import { expect } from '@oclif/test';
import * as sinon from 'sinon';
import { runSafeQuery } from '../../../src/common/selectors/selectorUtils';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

describe('selectorUtils', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('runSafeQuery', () => {
    it('handles missing connection', async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await runSafeQuery(null as any as Connection, 'queryString');
      } catch (err) {
        const error = err as Error;
        expect(error.name).to.equal('Connection-requiredError');
        expect(error.message).to.equal(messages.getMessage('error.connection-required'));
      }
    });

    it('handles missing query string', async () => {
      const mockConnection = sandbox.createStubInstance(Connection);
      try {
        await runSafeQuery(mockConnection, '');
      } catch (err) {
        const error = err as Error;
        expect(error.name).to.equal('Query-string-requiredError');
        expect(error.message).to.equal(messages.getMessage('error.query-string-required'));
      }
    });

    it('handles no results found', async () => {
      const mockConnection = sandbox.createStubInstance(Connection);
      mockConnection.query.resolves({
        done: true,
        records: [],
        totalSize: 0,
      });

      try {
        await runSafeQuery(mockConnection, 'queryString');
      } catch (err) {
        const error = err as Error;
        expect(error.name).to.equal('No-results-foundError');
        expect(error.message).to.equal(messages.getMessage('error.no-results-found'));
      }
    });

    it('handles errored query', async () => {
      const mockConnection = sandbox.createStubInstance(Connection);
      mockConnection.query.throws({ name: 'BOOM' });

      try {
        await runSafeQuery(mockConnection, 'queryString');
      } catch (err) {
        const error = err as Error;
        expect(error.name).to.equal('Query-failedError');
        expect(error.message).to.equal(messages.getMessage('error.query-failed', ['BOOM']));
      }
    });

    it('handles a query correctly', async () => {
      const queryReuslt = {
        done: true,
        records: [{ Id: 'recordId', Name: 'recordName' }],
        totalSize: 1,
      };
      const mockConnection = sandbox.createStubInstance(Connection);
      mockConnection.query.resolves(queryReuslt);
      const result = await runSafeQuery(mockConnection, 'queryString');
      expect(result).to.equal(queryReuslt);
      const builderArgs = mockConnection.query.getCall(0).args;
      expect(builderArgs[0]).to.contain('queryString');
      expect(builderArgs[1]?.autoFetch).to.equal(true);
      expect(builderArgs[1]?.maxFetch).to.equal(10_000);
    });
  });
});
