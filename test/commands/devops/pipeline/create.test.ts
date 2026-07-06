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
import { GitHubOwnerNotFoundError } from '../../../../src/utils/createPipeline.js';

describe('devops pipeline create', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CreateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const createPipelineStub = sinon.stub();
  const detectRepoTypeStub = sinon.stub();
  const validateGitHubOwnerStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/pipeline/create.js', {
      '../../../../src/utils/createPipeline.js': {
        createPipeline: createPipelineStub,
        detectRepoType: detectRepoTypeStub,
        validateGitHubOwner: validateGitHubOwnerStub,
        GitHubOwnerNotFoundError,
      },
    });
    CreateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    createPipelineStub.reset();
    detectRepoTypeStub.reset();
    validateGitHubOwnerStub.reset();
    validateGitHubOwnerStub.resolves();
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
        expect(ctx.stdout).to.contain('sf devops pipeline project add');
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

  describe('--create-repo without --repo-owner for github', () => {
    test
      .stdout()
      .stderr()
      .it('errors when --repo-owner is missing for github', async (ctx) => {
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

  describe('--create-repo without --bitbucket-workspace for bitbucket', () => {
    test
      .stdout()
      .stderr()
      .it('errors when --bitbucket-workspace is missing for bitbucket', async (ctx) => {
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
            'bitbucket',
            '--create-repo',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('--bitbucket-workspace flag is required');
      });
  });

  describe('create with --create-repo for bitbucket', () => {
    test
      .stdout()
      .stderr()
      .it('creates bitbucket pipeline with workspace and project key', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createPipelineStub.resolves({
          success: true,
          pipelineId: '0XB000000000003',
          name: 'Release Pipeline',
          status: 'Inactive',
          repository: {
            repoUrl: 'https://bitbucket.org/myworkspace/my-new-repo',
            repoType: 'bitbucket',
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
          'bitbucket',
          '--bitbucket-workspace',
          'myworkspace',
          '--bitbucket-project-key',
          'PROJ',
          '--create-repo',
        ]);

        expect(ctx.stdout).to.contain('Created repository: my-new-repo (bitbucket)');
        expect(ctx.stdout).to.contain('Successfully created pipeline: Release Pipeline');
        expect(createPipelineStub.calledWithMatch({ bitbucketWorkspace: 'myworkspace', bitbucketProjectKey: 'PROJ' }))
          .to.be.true;
      });
  });

  describe('--create-repo with invalid GitHub owner (API fallback)', () => {
    test
      .stdout()
      .stderr()
      .it('shows owner-not-found error when pre-flight was skipped and API returns init failure', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        validateGitHubOwnerStub.resolves(); // pre-flight skipped (e.g. rate-limited)
        createPipelineStub.rejects(
          new Error(
            "REPOSITORY_CREATION_FAILED:Failed to create VCS repository: - SFAP API call failed with status code: 500, Response: {success=false, error=Error creating repository: Pushing to https://github.com/ash/repoooo1.git\nremote: Repository not found.\nfatal: repository 'https://github.com/ash/repoooo1.git/' not found\n}"
          )
        );

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'repoooo1',
            '--repo-type',
            'github',
            '--repo-owner',
            'ash',
            '--create-repo',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('does not exist or is not accessible');
        expect(ctx.stderr).to.not.contain('Details:');
      });
  });

  describe('--create-repo with invalid GitHub owner', () => {
    test
      .stdout()
      .stderr()
      .it('errors before calling the API when owner does not exist on GitHub', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        validateGitHubOwnerStub.rejects(new GitHubOwnerNotFoundError('ash'));

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'repoooo1',
            '--repo-type',
            'github',
            '--repo-owner',
            'ash',
            '--create-repo',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('ash');
        expect(ctx.stderr).to.contain('does not exist or is not accessible');
        expect(createPipelineStub.called).to.be.false;
      });
  });

  describe('--create-repo with already existing repo name', () => {
    test
      .stdout()
      .stderr()
      .it('shows repo-name-already-exists error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        validateGitHubOwnerStub.resolves();
        createPipelineStub.rejects(
          new Error(
            'REPOSITORY_CREATION_FAILED:Failed to create VCS repository: - SFAP API call failed with status code: 500, Response: {success=false, error=Error creating repository: Failed to create repository: name already exists on this account}'
          )
        );

        try {
          await CreateCommand.run([
            '--target-org',
            'testOrg',
            '--name',
            'Pipeline',
            '--repo',
            'existing-repo',
            '--repo-type',
            'github',
            '--repo-owner',
            'myorg',
            '--create-repo',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already exists on this account');
        expect(ctx.stderr).to.contain('existing-repo');
        expect(ctx.stderr).to.not.contain('Details:');
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
