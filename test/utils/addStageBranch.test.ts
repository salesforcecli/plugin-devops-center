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
import { addStageBranch } from '../../src/utils/addStageBranch.js';

describe('addStageBranch utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls PATCH endpoint with correct body when attaching existing branch', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({
      id: '0Xp000000000001',
      status: 'SUCCESS',
      message: '',
      repoBranchId: '0Xq000000000001',
    });

    const result = await addStageBranch({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0Xo000000000001',
      stageId: '0Xp000000000001',
      branchName: 'main',
      createVcsBranch: false,
    });

    expect(result.success).to.be.true;
    expect(result.stageId).to.equal('0Xp000000000001');
    expect(result.branchName).to.equal('main');
    expect(result.branchCreated).to.be.false;
    expect(result.repoBranchId).to.equal('0Xq000000000001');
    expect(result.pipelineId).to.equal('0Xo000000000001');

    const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
    expect(callArgs.url).to.contain('/connect/devops/pipelines/0Xo000000000001/stages/0Xp000000000001');
    expect(callArgs.method).to.equal('PATCH');

    const body = JSON.parse(callArgs.body as string);
    expect(body.vcsBranch).to.equal('main');
    expect(body.createVcsBranch).to.equal('false');
  });

  it('sends createVcsBranch as "true" when creating a new branch', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({
      id: '0Xp000000000002',
      status: 'SUCCESS',
      message: '',
      repoBranchId: '0Xq000000000002',
    });

    const result = await addStageBranch({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0Xo000000000001',
      stageId: '0Xp000000000002',
      branchName: 'integration',
      createVcsBranch: true,
    });

    expect(result.success).to.be.true;
    expect(result.branchCreated).to.be.true;
    expect(result.branchName).to.equal('integration');

    const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
    const body = JSON.parse(callArgs.body as string);
    expect(body.vcsBranch).to.equal('integration');
    expect(body.createVcsBranch).to.equal('true');
  });

  it('returns error when API responds with FAILED status', async () => {
    (connectionStub.request as sinon.SinonStub).resolves({
      id: '0Xp000000000001',
      status: 'FAILED',
      message: 'Branch "nonexistent" does not exist in the repository',
    });

    const result = await addStageBranch({
      connection: connectionStub as unknown as Connection,
      pipelineId: '0Xo000000000001',
      stageId: '0Xp000000000001',
      branchName: 'nonexistent',
      createVcsBranch: false,
    });

    expect(result.success).to.be.false;
    expect(result.stageId).to.equal('0Xp000000000001');
    expect(result.error).to.contain('does not exist');
  });

  it('propagates connection errors', async () => {
    (connectionStub.request as sinon.SinonStub).rejects(new Error('Network timeout'));

    try {
      await addStageBranch({
        connection: connectionStub as unknown as Connection,
        pipelineId: '0Xo000000000001',
        stageId: '0Xp000000000001',
        branchName: 'main',
        createVcsBranch: false,
      });
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect((e as Error).message).to.contain('Network timeout');
    }
  });
});
