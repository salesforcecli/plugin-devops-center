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

describe('devops project create', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CreateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const createProjectStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/project/create.js', {
      '../../../../src/utils/createProject.js': {
        createProject: createProjectStub,
      },
    });
    CreateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    createProjectStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful creation', () => {
    test
      .stdout()
      .stderr()
      .it('logs success with name and id', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createProjectStub.resolves({
          success: true,
          projectId: '1Qg000000000001',
          name: 'MyApp Release',
        });

        await CreateCommand.run(['--target-org', 'testOrg', '--name', 'MyApp Release']);

        expect(ctx.stdout).to.contain('Successfully created project: MyApp Release');
        expect(ctx.stdout).to.contain('1Qg000000000001');
      });
  });

  describe('successful creation with description', () => {
    test
      .stdout()
      .stderr()
      .it('logs description when provided', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createProjectStub.resolves({
          success: true,
          projectId: '1Qg000000000002',
          name: 'Platform Update',
          description: 'Platform services update',
        });

        await CreateCommand.run([
          '--target-org',
          'testOrg',
          '--name',
          'Platform Update',
          '--description',
          'Platform services update',
        ]);

        expect(ctx.stdout).to.contain('Platform Update');
        expect(ctx.stdout).to.contain('Platform services update');
      });
  });

  describe('creation failure', () => {
    test
      .stdout()
      .stderr()
      .it('shows failure error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createProjectStub.resolves({
          success: false,
          error: 'DUPLICATE_VALUE: Name already exists',
        });

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--name', 'Duplicate']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to create project');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        createProjectStub.rejects(new Error("sObject type 'DevopsProject' is not supported"));

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--name', 'Test']);
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
        createProjectStub.rejects(new Error('Network error'));

        try {
          await CreateCommand.run(['--target-org', 'testOrg', '--name', 'Test']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
