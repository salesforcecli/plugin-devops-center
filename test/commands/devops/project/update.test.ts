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

describe('devops project update', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let UpdateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const updateProjectStub = sinon.stub();
  const resolveProjectByNameStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/project/update.js', {
      '../../../../src/utils/updateProject.js': {
        updateProject: updateProjectStub,
        resolveProjectByName: resolveProjectByNameStub,
      },
    });
    UpdateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    updateProjectStub.reset();
    resolveProjectByNameStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful update by ID — description only', () => {
    test
      .stdout()
      .stderr()
      .it('logs success with updated description', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        updateProjectStub.resolves({
          success: true,
          projectId: '1Qg000000000001',
          description: 'New description',
        });

        await UpdateCommand.run([
          '--target-org',
          'testOrg',
          '--project-id',
          '1Qg000000000001',
          '--description',
          'New description',
        ]);

        expect(ctx.stdout).to.contain('Successfully updated project');
        expect(ctx.stdout).to.contain('New description');
      });
  });

  describe('successful update by name — isActive only', () => {
    test
      .stdout()
      .stderr()
      .it('logs success with updated isActive', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectByNameStub.resolves('1Qg000000000001');
        updateProjectStub.resolves({
          success: true,
          projectId: '1Qg000000000001',
          isActive: false,
        });

        await UpdateCommand.run(['--target-org', 'testOrg', '--project-name', 'MyApp Release', '--no-is-active']);

        expect(ctx.stdout).to.contain('Successfully updated project: MyApp Release');
        expect(ctx.stdout).to.contain('IsActive:    false');
      });
  });

  describe('successful update — both fields', () => {
    test
      .stdout()
      .stderr()
      .it('logs both description and isActive', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        updateProjectStub.resolves({
          success: true,
          projectId: '1Qg000000000001',
          description: 'Archived',
          isActive: false,
        });

        await UpdateCommand.run([
          '--target-org',
          'testOrg',
          '--project-id',
          '1Qg000000000001',
          '--description',
          'Archived',
          '--no-is-active',
        ]);

        expect(ctx.stdout).to.contain('Description: Archived');
        expect(ctx.stdout).to.contain('IsActive:    false');
      });
  });

  describe('no update fields provided', () => {
    test
      .stdout()
      .stderr()
      .it('errors when neither description nor is-active is given', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);

        try {
          await UpdateCommand.run(['--target-org', 'testOrg', '--project-id', '1Qg000000000001']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('--description');
      });
  });

  describe('update failure — sObject error', () => {
    test
      .stdout()
      .stderr()
      .it('shows failure error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        updateProjectStub.resolves({
          success: false,
          error: 'FIELD_INTEGRITY_EXCEPTION',
        });

        try {
          await UpdateCommand.run([
            '--target-org',
            'testOrg',
            '--project-id',
            '1Qg000000000001',
            '--description',
            'Bad update',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to update project');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error on resolve', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        resolveProjectByNameStub.rejects(new Error("sObject type 'DevopsProject' is not supported"));

        try {
          await UpdateCommand.run(['--target-org', 'testOrg', '--project-name', 'MyProject', '--description', 'test']);
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
      .it('rethrows non-DevOps errors from updateProject', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        updateProjectStub.rejects(new Error('Network error'));

        try {
          await UpdateCommand.run([
            '--target-org',
            'testOrg',
            '--project-id',
            '1Qg000000000001',
            '--description',
            'test',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
