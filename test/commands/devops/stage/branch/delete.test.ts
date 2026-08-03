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

import esmock from 'esmock';
import { expect, test } from '@oclif/test';
import sinon from 'sinon';
import { Org } from '@salesforce/core';

describe('devops stage branch delete', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DeleteBranchCommand: any;
  const mockQueryStub = sinon.stub();
  const mockConnection = { getApiVersion: () => '65.0', query: mockQueryStub };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const deleteStageBranchStub = sinon.stub();
  const fetchPipelineStagesStub = sinon.stub();

  const stageWithBranch = [
    { Id: '0Xp000000000001', Name: 'Production', NextStageId: null, SourceCodeRepositoryBranch: { Name: 'main' } },
  ];

  // Dev -> Integration -> Production. Removing Integration's branch should cascade to Dev.
  const devStageId = '0Xp00000000Dev1';
  const intStageId = '0Xp00000000Int1';
  const prodStageId = '0Xp0000000Prod1';
  const linearStages = [
    {
      Id: devStageId,
      Name: 'Development',
      NextStageId: intStageId,
      SourceCodeRepositoryBranch: { Name: 'dev' },
    },
    {
      Id: intStageId,
      Name: 'Integration',
      NextStageId: prodStageId,
      SourceCodeRepositoryBranch: { Name: 'integration' },
    },
    { Id: prodStageId, Name: 'Production', NextStageId: null, SourceCodeRepositoryBranch: { Name: 'main' } },
  ];

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/stage/branch/delete.js', {
      '../../../../../src/utils/deleteStageBranch.js': {
        deleteStageBranch: deleteStageBranchStub,
      },
      '../../../../../src/utils/pipelineUtils.js': {
        fetchPipelineStages: fetchPipelineStagesStub,
      },
    });
    DeleteBranchCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    deleteStageBranchStub.reset();
    fetchPipelineStagesStub.reset();
    mockQueryStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful deletion', () => {
    test
      .stdout()
      .stderr()
      .it('deletes branch and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        fetchPipelineStagesStub.resolves(stageWithBranch);
        deleteStageBranchStub.resolves({
          success: true,
          stageId: '0Xp000000000001',
          branchName: 'main',
          clearedStages: [{ stageId: '0Xp000000000001', stageName: 'Production', branchName: 'main' }],
        });

        await DeleteBranchCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000001',
        ]);

        expect(ctx.stdout).to.contain('Successfully deleted branch "main" from the stage.');
        expect(ctx.stdout).to.contain('0Xp000000000001');
        expect(ctx.stdout).to.contain('0Xo000000000001');
      });
  });

  describe('cascade to upstream stages', () => {
    test
      .stdout()
      .stderr()
      .it('removes branches from upstream stages and reports them', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        fetchPipelineStagesStub.resolves(linearStages);
        deleteStageBranchStub.resolves({
          success: true,
          stageId: intStageId,
          branchName: 'integration',
          clearedStages: [
            { stageId: intStageId, stageName: 'Integration', branchName: 'integration' },
            { stageId: devStageId, stageName: 'Development', branchName: 'dev' },
          ],
        });

        await DeleteBranchCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          intStageId,
        ]);

        expect(ctx.stdout).to.contain('Successfully deleted branch "integration" from the stage.');
        expect(ctx.stdout).to.contain('Also removed branches from upstream stages:');
        expect(ctx.stdout).to.contain('Development: "dev"');

        // The command should ask the util to clear both the target and its upstream stage.
        const stagesToClear = deleteStageBranchStub.firstCall.args[2] as Array<{ stageId: string }>;
        const clearedIds = stagesToClear.map((s) => s.stageId);
        expect(clearedIds).to.have.members([intStageId, devStageId]);
        expect(clearedIds).to.not.include(prodStageId);
      });
  });

  describe('pipeline already active', () => {
    test
      .stdout()
      .stderr()
      .it('shows active pipeline error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: true }] });

        try {
          await DeleteBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already active');
      });
  });

  describe('stage not found error', () => {
    test
      .stdout()
      .stderr()
      .it('shows friendly error when stage not found in pipeline', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        fetchPipelineStagesStub.resolves(stageWithBranch);

        try {
          await DeleteBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000099',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("doesn't exist in pipeline");
      });
  });

  describe('stage has no branch', () => {
    test
      .stdout()
      .stderr()
      .it('shows error when stage has no branch associated', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        fetchPipelineStagesStub.resolves([
          { Id: '0Xp000000000001', Name: 'Production', NextStageId: null, SourceCodeRepositoryBranch: null },
        ]);

        try {
          await DeleteBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("doesn't have a branch");
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        fetchPipelineStagesStub.rejects(new Error("sObject type 'DevopsPipelineStage' is not supported"));

        try {
          await DeleteBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });
  });

  describe('rethrows other errors', () => {
    test
      .stdout()
      .stderr()
      .it('rethrows non-DevOps errors from deleteStageBranch', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockQueryStub.resolves({ records: [{ IsActive: false }] });
        fetchPipelineStagesStub.resolves(stageWithBranch);
        deleteStageBranchStub.rejects(new Error('Network error'));

        try {
          await DeleteBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
