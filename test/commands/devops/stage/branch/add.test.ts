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

describe('devops stage branch add', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let AddBranchCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const addStageBranchStub = sinon.stub();
  const fetchPipelineStagesStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/stage/branch/add.js', {
      '../../../../../src/utils/addStageBranch.js': {
        addStageBranch: addStageBranchStub,
      },
      '../../../../../src/utils/pipelineUtils.js': {
        fetchPipelineStages: fetchPipelineStagesStub,
      },
    });
    AddBranchCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    addStageBranchStub.reset();
    fetchPipelineStagesStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('attach existing branch', () => {
    test
      .stdout()
      .stderr()
      .it('attaches branch and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);
        addStageBranchStub.resolves({
          success: true,
          stageId: '0Xp000000000001',
          branchName: 'main',
          branchCreated: false,
          repoBranchId: '0Xq000000000001',
          pipelineId: '0Xo000000000001',
        });

        await AddBranchCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000001',
          '--branch-name',
          'main',
        ]);

        expect(ctx.stdout).to.contain('Successfully associated branch with the stage.');
        expect(ctx.stdout).to.contain('0Xp000000000001');
        expect(ctx.stdout).to.contain('main');
        expect(ctx.stdout).to.contain('0Xo000000000001');
      });
  });

  describe('create and attach new branch', () => {
    test
      .stdout()
      .stderr()
      .it('creates branch and logs success with newly created indicator', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000002', Name: 'Integration' }]);
        addStageBranchStub.resolves({
          success: true,
          stageId: '0Xp000000000002',
          branchName: 'integration',
          branchCreated: true,
          repoBranchId: '0Xq000000000002',
          pipelineId: '0Xo000000000001',
        });

        await AddBranchCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000002',
          '--branch-name',
          'integration',
          '--create-vcs-branch',
        ]);

        expect(ctx.stdout).to.contain('Created branch and associated it with the stage.');
        expect(ctx.stdout).to.contain('integration');
        expect(ctx.stdout).to.contain('newly created');
      });
  });

  describe('right-to-left ordering enforcement', () => {
    test
      .stdout()
      .stderr()
      .it('blocks branch setup when next stage has no branch configured', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([
          {
            Id: '0Xp000000000001',
            Name: 'Development',
            NextStageId: '0Xp000000000002',
            SourceCodeRepositoryBranch: null,
          },
          {
            Id: '0Xp000000000002',
            Name: 'Integration',
            NextStageId: '0Xp000000000003',
            SourceCodeRepositoryBranch: null,
          },
          {
            Id: '0Xp000000000003',
            Name: 'Production',
            NextStageId: null,
            SourceCodeRepositoryBranch: { Name: 'main' },
          },
        ]);

        try {
          await AddBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
            '--branch-name',
            'dev',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('must set up a branch on stage "Integration"');
      });

    test
      .stdout()
      .stderr()
      .it('allows branch setup when next stage already has a branch', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([
          {
            Id: '0Xp000000000001',
            Name: 'Development',
            NextStageId: '0Xp000000000002',
            SourceCodeRepositoryBranch: null,
          },
          {
            Id: '0Xp000000000002',
            Name: 'Integration',
            NextStageId: '0Xp000000000003',
            SourceCodeRepositoryBranch: { Name: 'integration' },
          },
          {
            Id: '0Xp000000000003',
            Name: 'Production',
            NextStageId: null,
            SourceCodeRepositoryBranch: { Name: 'main' },
          },
        ]);
        addStageBranchStub.resolves({
          success: true,
          stageId: '0Xp000000000001',
          branchName: 'dev',
          branchCreated: false,
          repoBranchId: '0Xq000000000001',
          pipelineId: '0Xo000000000001',
        });

        await AddBranchCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000001',
          '--branch-name',
          'dev',
        ]);

        expect(ctx.stdout).to.contain('Successfully associated branch with the stage.');
      });

    test
      .stdout()
      .stderr()
      .it('allows branch setup on the last stage (no NextStageId)', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([
          {
            Id: '0Xp000000000001',
            Name: 'Development',
            NextStageId: '0Xp000000000003',
            SourceCodeRepositoryBranch: null,
          },
          { Id: '0Xp000000000003', Name: 'Production', NextStageId: null, SourceCodeRepositoryBranch: null },
        ]);
        addStageBranchStub.resolves({
          success: true,
          stageId: '0Xp000000000003',
          branchName: 'main',
          branchCreated: false,
          repoBranchId: '0Xq000000000003',
          pipelineId: '0Xo000000000001',
        });

        await AddBranchCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000003',
          '--branch-name',
          'main',
        ]);

        expect(ctx.stdout).to.contain('Successfully associated branch with the stage.');
      });
  });

  describe('stage not found error', () => {
    test
      .stdout()
      .stderr()
      .it('shows friendly error when stage not found in pipeline', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);

        try {
          await AddBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000099',
            '--branch-name',
            'main',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("doesn't exist in pipeline");
      });
  });

  describe('API returns FAILED status', () => {
    test
      .stdout()
      .stderr()
      .it('shows error message from API', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);
        addStageBranchStub.resolves({
          success: false,
          stageId: '0Xp000000000001',
          error: 'Branch "nonexistent" does not exist in the repository',
        });

        try {
          await AddBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
            '--branch-name',
            'nonexistent',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to associate branch with stage');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.rejects(new Error("sObject type 'DevopsPipelineStage' is not supported"));

        try {
          await AddBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
            '--branch-name',
            'main',
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
      .it('rethrows non-DevOps errors from addStageBranch', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);
        addStageBranchStub.rejects(new Error('Network error'));

        try {
          await AddBranchCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
            '--branch-name',
            'main',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
