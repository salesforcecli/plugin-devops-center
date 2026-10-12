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
import { deleteStageBranch } from '../../src/utils/deleteStageBranch.js';

describe('deleteStageBranch utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;
  let updateStub: sinon.SinonStub;
  let sobjectStub: sinon.SinonStub;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    updateStub = sinon.stub();
    sobjectStub = sinon.stub().returns({ update: updateStub });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionStub as any).sobject = sobjectStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('clears the branch lookup for the target stage', async () => {
    updateStub.resolves([{ success: true }]);

    const result = await deleteStageBranch(connectionStub, 'STAGE1', [
      { stageId: 'STAGE1', stageName: 'Production', branchName: 'main' },
    ]);

    expect(sobjectStub.calledWith('DevopsPipelineStage')).to.be.true;
    expect(updateStub.calledWith([{ Id: 'STAGE1', SourceCodeRepositoryBranchId: null }])).to.be.true;
    expect(result.success).to.be.true;
    expect(result.stageId).to.equal('STAGE1');
    expect(result.branchName).to.equal('main');
    expect(result.clearedStages).to.have.length(1);
  });

  it('cascades the clear to upstream stages', async () => {
    updateStub.resolves([{ success: true }, { success: true }]);

    const result = await deleteStageBranch(connectionStub, 'INT', [
      { stageId: 'INT', stageName: 'Integration', branchName: 'integration' },
      { stageId: 'DEV', stageName: 'Development', branchName: 'dev' },
    ]);

    const updateArg = updateStub.firstCall.args[0] as Array<{ Id: string; SourceCodeRepositoryBranchId: null }>;
    expect(updateArg.map((u) => u.Id)).to.deep.equal(['INT', 'DEV']);
    expect(updateArg.every((u) => u.SourceCodeRepositoryBranchId === null)).to.be.true;
    expect(result.success).to.be.true;
    expect(result.branchName).to.equal('integration');
    expect(result.clearedStages).to.have.length(2);
  });

  it('returns failure when an update fails', async () => {
    updateStub.resolves([{ success: false, errors: [{ message: 'record locked' }] }]);

    const result = await deleteStageBranch(connectionStub, 'STAGE1', [
      { stageId: 'STAGE1', stageName: 'Production', branchName: 'main' },
    ]);

    expect(result.success).to.be.false;
    expect(result.error).to.contain('record locked');
  });

  it('handles a single (non-array) update result', async () => {
    updateStub.resolves({ success: true });

    const result = await deleteStageBranch(connectionStub, 'STAGE1', [
      { stageId: 'STAGE1', stageName: 'Production', branchName: 'main' },
    ]);

    expect(result.success).to.be.true;
  });
});
