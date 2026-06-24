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
import { addPipelineStage } from '../../src/utils/addPipelineStage.js';

describe('addPipelineStage utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;
  let createStub: sinon.SinonStub;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    createStub = sinon.stub();
    (connectionStub.sobject as sinon.SinonStub).returns({ create: createStub });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates sObject record and returns result', async () => {
    createStub.resolves({ id: '0Xc000000000005', success: true });

    const result = await addPipelineStage({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
      name: 'Development',
      nextStageId: '0Xc000000000002',
    });

    expect(result.success).to.be.true;
    expect(result.stageId).to.equal('0Xc000000000005');
    expect(result.name).to.equal('Development');
    expect(result.nextStageId).to.equal('0Xc000000000002');
    expect(result.pipelineId).to.equal('0XB000000000001');

    expect((connectionStub.sobject as sinon.SinonStub).calledWith('DevopsPipelineStage')).to.be.true;
    const createArg = createStub.firstCall.args[0] as Record<string, unknown>;
    expect(createArg.Name).to.equal('Development');
    expect(createArg.DevopsPipelineId).to.equal('0XB000000000001');
    expect(createArg.NextStageId).to.equal('0Xc000000000002');
  });

  it('returns error when sObject create fails', async () => {
    createStub.resolves({ success: false, errors: [{ message: 'Invalid pipeline ID' }] });

    const result = await addPipelineStage({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
      name: 'Fail',
      nextStageId: '0Xc000000000002',
    });

    expect(result.success).to.be.false;
    expect(result.error).to.contain('Invalid pipeline ID');
  });

  it('propagates connection errors', async () => {
    createStub.rejects(new Error('Connection refused'));

    try {
      await addPipelineStage({
        connection: connectionStub as unknown as Connection,
        pipelineId: '0XB000000000001',
        name: 'Fail',
        nextStageId: '0Xc000000000002',
      });
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).to.contain('Connection refused');
    }
  });
});
