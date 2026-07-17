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

describe('devops pipeline project delete', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DeleteCommand: any;
  const detachProjectStub = sinon.stub();
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/pipeline/project/delete.js', {
      '../../../../../src/utils/detachProject.js': {
        detachProject: detachProjectStub,
      },
    });
    DeleteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    detachProjectStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful removal', () => {
    test
      .stdout()
      .stderr()
      .it('logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detachProjectStub.resolves({
          success: true,
          projectId: '0Hn000000000001',
          pipelineId: '0XB000000000001',
        });

        await DeleteCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0XB000000000001',
          '--project-id',
          '0Hn000000000001',
        ]);

        expect(ctx.stdout).to.contain('Successfully removed project from pipeline');
        expect(ctx.stdout).to.contain('0Hn000000000001');
        expect(ctx.stdout).to.contain('0XB000000000001');
      });
  });

  describe('project not attached', () => {
    test
      .stdout()
      .stderr()
      .it('shows project not attached error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detachProjectStub.rejects(new Error('ProjectNotAttached:0Hn000000000001:0XB000000000001'));

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--project-id',
            '0Hn000000000001',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('not attached to pipeline');
      });
  });

  describe('deletion failure', () => {
    test
      .stdout()
      .stderr()
      .it('shows failure error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detachProjectStub.resolves({
          success: false,
          projectId: '0Hn000000000001',
          pipelineId: '0XB000000000001',
          error: 'ENTITY_IS_LOCKED',
        });

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--project-id',
            '0Hn000000000001',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to remove project from pipeline');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        detachProjectStub.rejects(new Error("sObject type 'DevopsProjectPipeline' is not supported"));

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--project-id',
            '0Hn000000000001',
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
        detachProjectStub.rejects(new Error('Network error'));

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--project-id',
            '0Hn000000000001',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
