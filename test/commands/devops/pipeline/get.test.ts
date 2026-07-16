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

describe('devops pipeline get', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GetCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const getPipelineStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/pipeline/get.js', {
      '../../../../src/utils/getPipeline.js': {
        getPipeline: getPipelineStub,
      },
    });
    GetCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    getPipelineStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('returns pipeline details', () => {
    test
      .stdout()
      .stderr()
      .it('displays pipeline info, stages, and projects', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getPipelineStub.resolves({
          id: '0Do000000000001',
          name: 'Main Pipeline',
          description: 'Primary release pipeline',
          isActive: true,
          stages: [
            {
              id: 'stage1',
              name: 'Integration',
              nextStageId: 'stage2',
              branchName: 'int',
              repositoryName: 'myrepo',
              repositoryOwner: 'myorg',
            },
            {
              id: 'stage2',
              name: 'Production',
              nextStageId: null,
              branchName: 'main',
              repositoryName: 'myrepo',
              repositoryOwner: 'myorg',
            },
          ],
          connectedProjects: [{ id: 'proj1', name: 'MyApp' }],
        });

        await GetCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0Do000000000001']);

        expect(ctx.stdout).to.contain('Main Pipeline');
        expect(ctx.stdout).to.contain('Primary release pipeline');
        expect(ctx.stdout).to.contain('Integration');
        expect(ctx.stdout).to.contain('Production');
        expect(ctx.stdout).to.contain('myorg/myrepo');
        expect(ctx.stdout).to.contain('MyApp');
      });
  });

  describe('pipeline with no stages or projects', () => {
    test
      .stdout()
      .stderr()
      .it('displays pipeline info only', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getPipelineStub.resolves({
          id: '0Do000000000002',
          name: 'Empty Pipeline',
          description: null,
          isActive: false,
          stages: [],
          connectedProjects: [],
        });

        await GetCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0Do000000000002']);

        expect(ctx.stdout).to.contain('Empty Pipeline');
        expect(ctx.stdout).to.contain('Active:      false');
      });
  });

  describe('pipeline not found', () => {
    test
      .stdout()
      .stderr()
      .it('throws not found error', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getPipelineStub.rejects(new Error('Pipeline not found: 0Do000000000099'));

        try {
          await GetCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0Do000000000099']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Pipeline not found');
        }
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getPipelineStub.rejects(new Error("sObject type 'DevopsPipeline' is not supported"));

        try {
          await GetCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0Do000000000001']);
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
        getPipelineStub.rejects(new Error('Network error'));

        try {
          await GetCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0Do000000000001']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
