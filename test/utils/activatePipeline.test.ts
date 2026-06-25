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

import { expect } from '@oclif/test';
import sinon from 'sinon';
import { Connection } from '@salesforce/core';
import { activatePipeline } from '../../src/utils/activatePipeline.js';

describe('activatePipeline utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls activate endpoint and returns success', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({});
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    const result = await activatePipeline({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
    });

    expect(result.success).to.be.true;
    expect(result.pipelineId).to.equal('0XB000000000001');
    expect(result.status).to.equal('Active');

    const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
    expect(callArgs.url).to.contain('/connect/devops/pipelines/0XB000000000001/activate');
    expect(callArgs.method).to.equal('POST');
  });

  it('propagates API errors', async () => {
    (connectionStub.request as sinon.SinonStub).rejects(new Error('Bad Request'));
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    try {
      await activatePipeline({
        connection: connectionStub as unknown as Connection,
        pipelineId: '0XB000000000001',
      });
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).to.contain('Bad Request');
    }
  });
});
