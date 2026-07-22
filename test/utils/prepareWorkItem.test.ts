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
import { prepareWorkItem, resolveProjectIdFromWorkItem } from '../../src/utils/prepareWorkItem.js';

describe('prepareWorkItem', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls prepare endpoint and returns success with requestToken', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({
      success: true,
      requestToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    const result = await prepareWorkItem({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
      workItemId: '0Wx000000000001',
      sourceStageId: '05S000000000001',
      targetStageId: '05S000000000002',
    });

    expect(result.success).to.be.true;
    expect(result.requestToken).to.equal('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(result.errorCode).to.be.null;
    expect(result.errorMessage).to.be.null;

    const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
    expect(callArgs.url).to.contain('/connect/devops/pipelines/0XB000000000001/promote/oneoff/prepare');
    expect(callArgs.method).to.equal('POST');
    const body = JSON.parse(callArgs.body as string);
    expect(body.selectedWorkItemId).to.equal('0Wx000000000001');
    expect(body.sourceStageId).to.equal('05S000000000001');
    expect(body.targetStageId).to.equal('05S000000000002');
  });

  it('returns failure with error code and message', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({
      success: false,
      errorCode: 'ALM_ERR_001',
      errorMessage: 'Source stage and target stage are not compatible for one-off promotion.',
    });
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    const result = await prepareWorkItem({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0XB000000000001',
      workItemId: '0Wx000000000001',
      sourceStageId: '05S000000000001',
      targetStageId: '05S000000000002',
    });

    expect(result.success).to.be.false;
    expect(result.requestToken).to.be.null;
    expect(result.errorCode).to.equal('ALM_ERR_001');
    expect(result.errorMessage).to.equal('Source stage and target stage are not compatible for one-off promotion.');
  });

  it('propagates API errors', async () => {
    (connectionStub.request as sinon.SinonStub).rejects(new Error('Internal Server Error'));
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

    try {
      await prepareWorkItem({
        connection: connectionStub as unknown as Connection,
        pipelineId: '0XB000000000001',
        workItemId: '0Wx000000000001',
        sourceStageId: '05S000000000001',
        targetStageId: '05S000000000002',
      });
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).to.contain('Internal Server Error');
    }
  });
});

describe('resolveProjectIdFromWorkItem', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns project ID and pipeline stage ID from work item', async () => {
    (connectionStub.query as sinon.SinonStub).resolves({
      records: [{ DevopsProjectId: 'PROJ001', DevopsPipelineStageId: '05S000000000001' }],
    });

    const result = await resolveProjectIdFromWorkItem(connectionStub as unknown as Connection, '0Wx000000000001');
    expect(result.projectId).to.equal('PROJ001');
    expect(result.pipelineStageId).to.equal('05S000000000001');
  });

  it('throws when work item is not found', async () => {
    (connectionStub.query as sinon.SinonStub).resolves({
      records: [],
    });

    try {
      await resolveProjectIdFromWorkItem(connectionStub as unknown as Connection, '0Wx999999999999');
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).to.contain('0Wx999999999999');
      expect((e as Error).message).to.contain('not found');
    }
  });
});
