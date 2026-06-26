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

describe('devops pipeline create', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CreateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const createPipelineStub = sinon.stub();
  const detectRepoTypeStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/pipeline/create.js', {
      '../../../../src/utils/createPipeline.js': {
        createPipeline: createPipelineStub,
        detectRepoType: detectRepoTypeStub,
      },
    });
    CreateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    createPipelineStub.reset();
    detectRepoTypeStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create with existing repo URL', () => {
    test
      .stdout()
      .stderr()
      .it('creates pipeline and logs success with next steps', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detectRepoTypeStub.returns('github');
        createPipelineStub.resolves({
          success: true,
          pipelineId: '0XB000000000001',
          name: 'Release Pipeline',
          status: 'Inactive',
          repository: {
            repoUrl: 'https://github.com/myorg/myrepo',
            repoType: 'github',
            created: false,
          },
        });

        await CreateCommand.run([
          '--target-org',
          'testOrg',
          '--name',
          'Release Pipeline',
          '--repo',
          'https://github.com/myorg/myrepo',
        ]);

        expect(ctx.stdout).to.contain('Successfully created pipeline: Release Pipeline');
        expect(ctx.stdout).to.contain('0XB000000000001');
        expect(ctx.stdout).to.contain('https://github.com/myorg/myrepo');
        expect(ctx.stdout).to.contain('Next steps');
        expect(ctx.stdout).to.contain('sf devops pipeline stage add');
        expect(ctx.stdout).to.contain('sf devops pipeline attach-project');
      });
  });

  describe('create with --create-repo', () => {
    test
      .stdout()
      .stderr()
      .it('logs repo creation and pipeline success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createPipelineStub.resolves({
          success: true,
          pipelineId: '0XB000000000002',
          name: 'Release Pipeline',
          status: 'Inactive',
          repository: {
            repoUrl: 'https://github.com/myorg/my-new-repo',
            repoType: 'github',
            created: true,
          },
        });

        await CreateCommand.run([
          '--target-org',
          'testOrg',
          '--name',
          'Release Pipeline',
          '--repo',
          'my-new-repo',
          '--repo-type',
          'github',
          '--repo-owner',
          'myorg',
          '--create-repo',
        ]);

        expect(ctx.stdout).to.contain('Created repository: my-new-repo (github)');
        expect(ctx.stdout).to.contain('Successfully created pipeline: Release Pipeline');
      });
  });

  describe('--create-repo without --repo-type', () => {
    test
      .stdout()
      .stderr()
      .it('errors when --repo-type is missing', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'my-repo',
            '--create-repo',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('--repo-type flag is required');
      });
  });

  describe('--create-repo without --repo-owner', () => {
    test
      .stdout()
      .stderr()
      .it('errors when --repo-owner is missing', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'my-repo',
            '--repo-type',
            'github',
            '--create-repo',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('--repo-owner flag is required');
      });
  });

  describe('undetectable repo type', () => {
    test
      .stdout()
      .stderr()
      .it('errors when repo type cannot be detected from URL', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detectRepoTypeStub.returns(undefined);

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'https://gitlab.com/myorg/myrepo',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Unable to detect the repository type');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detectRepoTypeStub.returns('github');
        createPipelineStub.rejects(new Error("sObject type 'Pipeline' is not supported"));

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'https://github.com/myorg/myrepo',
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
      .it('rethrows non-DevOps errors', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detectRepoTypeStub.returns('github');
        createPipelineStub.rejects(new Error('Network error'));

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'https://github.com/myorg/myrepo',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
