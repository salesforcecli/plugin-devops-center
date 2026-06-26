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
import { createProject } from '../../src/utils/createProject.js';

describe('createProject', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;
  let sobjectStub: sinon.SinonStub;
  let createStub: sinon.SinonStub;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    createStub = sinon.stub();
    sobjectStub = sinon.stub().returns({ create: createStub });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionStub as any).sobject = sobjectStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns success with project id and name', async () => {
    createStub.resolves({ success: true, id: '1Qg000000000001', errors: [] });

    const result = await createProject({
      connection: connectionStub as unknown as Connection,
      name: 'MyApp Release',
      description: 'My description',
    });

    expect(result.success).to.be.true;
    expect(result.projectId).to.equal('1Qg000000000001');
    expect(result.name).to.equal('MyApp Release');
    expect(result.description).to.equal('My description');
    expect(sobjectStub.calledWith('DevopsProject')).to.be.true;
  });

  it('returns success without description when empty', async () => {
    createStub.resolves({ success: true, id: '1Qg000000000002', errors: [] });

    const result = await createProject({
      connection: connectionStub as unknown as Connection,
      name: 'No Desc Project',
      description: '',
    });

    expect(result.success).to.be.true;
    expect(result.description).to.be.undefined;
  });

  it('returns error on sObject create failure', async () => {
    createStub.resolves({ success: false, id: null, errors: ['DUPLICATE_VALUE: Name already exists'] });

    const result = await createProject({
      connection: connectionStub as unknown as Connection,
      name: 'Duplicate',
      description: '',
    });

    expect(result.success).to.be.false;
    expect(result.error).to.contain('DUPLICATE_VALUE');
  });

  it('propagates connection errors', async () => {
    createStub.rejects(new Error('Connection refused'));

    try {
      await createProject({
        connection: connectionStub as unknown as Connection,
        name: 'Fail',
        description: '',
      });
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).to.contain('Connection refused');
    }
  });
});
