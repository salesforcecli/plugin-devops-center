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
import { promoteStage } from '../../src/utils/promoteStage.js';

describe('promoteStage utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls promote endpoint with correct payload', async () => {
    const mockResponse = {
      requestId: 'f43953d8-9b20-4dc3-8830-5ade632db0b1',
      status: 'SUBMITTED',
      message: 'Submitted for promotion',
      promotedWorkitemIds: ['0Wx000000000001', '0Wx000000000002'],
    };
    (connectionStub.request as sinon.SinonStub).resolves(mockResponse);
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    const result = await promoteStage({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
      workItemIds: ['0Wx000000000001', '0Wx000000000002'],
      targetStageId: '05S000000000002',
    });

    expect(result.requestId).to.equal('f43953d8-9b20-4dc3-8830-5ade632db0b1');
    expect(result.status).to.equal('SUBMITTED');
    expect(result.promotedWorkitemIds).to.deep.equal(['0Wx000000000001', '0Wx000000000002']);

    const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
    expect(callArgs.url).to.contain('/connect/devops/pipelines/0XB000000000001/promote');
    expect(callArgs.method).to.equal('POST');

    const body = JSON.parse(callArgs.body as string) as Record<string, unknown>;
    expect(body.workitemIds).to.deep.equal(['0Wx000000000001', '0Wx000000000002']);
    expect(body.targetStageId).to.equal('05S000000000002');
    expect(body.allWorkItemsInStage).to.equal(false);
    expect(body.isCheckDeploy).to.equal(false);
    expect(body).to.not.have.property('promoteOptions');
    expect(body).to.not.have.property('fullDeploy');
    expect(body).to.not.have.property('testLevel');
    expect(body.deployOptions).to.deep.equal({ testLevel: 'Default', isFullDeploy: false, runTests: [] });
  });

  it('passes fullDeploy, testLevel, and runTests into deployOptions', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({
      requestId: 'abc',
      status: 'SUBMITTED',
      message: '',
      promotedWorkitemIds: [],
    });
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    await promoteStage({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
      workItemIds: ['0Wx000000000001'],
      targetStageId: '05S000000000002',
      fullDeploy: true,
      testLevel: 'RunLocalTests',
      runTests: ['MyTest'],
    });

    const body = JSON.parse((connectionStub.request as sinon.SinonStub).firstCall.args[0].body as string) as Record<
      string,
      unknown
    >;
    expect(body.deployOptions).to.deep.equal({ testLevel: 'RunLocalTests', isFullDeploy: true, runTests: ['MyTest'] });
  });

  it('propagates API errors', async () => {
    (connectionStub.request as sinon.SinonStub).rejects(new Error('Bad Request'));
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    try {
      await promoteStage({
        connection: connectionStub as unknown as Connection,
        pipelineId: '0XB000000000001',
        workItemIds: ['0Wx000000000001'],
        targetStageId: '05S000000000002',
      });
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).to.contain('Bad Request');
    }
  });

  it('handles missing fields in response', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({});
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    const result = await promoteStage({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
      workItemIds: ['0Wx000000000001'],
      targetStageId: '05S000000000002',
    });

    expect(result.requestId).to.equal('');
    expect(result.status).to.equal('');
    expect(result.message).to.equal('');
    expect(result.promotedWorkitemIds).to.deep.equal([]);
  });
});
