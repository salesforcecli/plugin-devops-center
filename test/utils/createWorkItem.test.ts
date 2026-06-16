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
import { createWorkItem } from '../../src/utils/createWorkItem.js';

describe('createWorkItem', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns success with id and name from response', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({ id: 'WI001', name: 'WI-001', subject: 'Fix bug' });

    const result = await createWorkItem({
      connection: connectionStub as unknown as Connection,
      projectId: 'PROJ001',
      subject: 'Fix bug',
      description: 'Details',
    });

    expect(result.success).to.be.true;
    expect(result.workItemId).to.equal('WI001');
    expect(result.workItemName).to.equal('WI-001');
    expect(result.subject).to.equal('Fix bug');
  });

  it('returns success with uppercase Id and Name from response', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({ Id: 'WI002', Name: 'WI-002', Subject: 'My subject' });

    const result = await createWorkItem({
      connection: connectionStub as unknown as Connection,
      projectId: 'PROJ001',
      subject: 'My subject',
      description: '',
    });

    expect(result.success).to.be.true;
    expect(result.workItemId).to.equal('WI002');
    expect(result.workItemName).to.equal('WI-002');
  });

  it('returns error with message on failure', async () => {
    const err = new Error('Bad request') as Error & { response?: { data?: unknown } };
    (connectionStub.request as sinon.SinonStub).rejects(err);

    const result = await createWorkItem({
      connection: connectionStub as unknown as Connection,
      projectId: 'PROJ001',
      subject: 'Fix bug',
      description: '',
    });

    expect(result.success).to.be.false;
    expect(result.error).to.include('Bad request');
  });

  it('returns error with object message on failure', async () => {
    const err = Object.assign(new Error('wrapper'), {
      response: { data: { message: 'Object error message' } },
    });
    (connectionStub.request as sinon.SinonStub).rejects(err);

    const result = await createWorkItem({
      connection: connectionStub as unknown as Connection,
      projectId: 'PROJ001',
      subject: 'Fix',
      description: '',
    });

    expect(result.success).to.be.false;
    expect(result.error).to.include('Object error message');
  });

  it('returns error with body details when response data has body array', async () => {
    const err = Object.assign(new Error('wrapper'), {
      response: { data: { message: 'Error', body: ['detail1', 'detail2'] } },
    });
    (connectionStub.request as sinon.SinonStub).rejects(err);

    const result = await createWorkItem({
      connection: connectionStub as unknown as Connection,
      projectId: 'PROJ001',
      subject: 'Fix',
      description: '',
    });

    expect(result.success).to.be.false;
    expect(result.error).to.include('detail1');
    expect(result.error).to.include('detail2');
  });
});
