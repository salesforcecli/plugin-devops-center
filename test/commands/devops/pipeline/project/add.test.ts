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

describe('devops pipeline project add', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let AddCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };
  const attachProjectStub = sinon.stub();
  const findExistingStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/pipeline/project/add.js', {
      '../../../../../src/utils/attachProject.js': {
        attachProject: attachProjectStub,
        findExistingAttachment: findExistingStub,
      },
    });
    AddCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    attachProjectStub.reset();
    findExistingStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful attachment', () => {
    test
      .stdout()
      .stderr()
      .it('attaches project and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        findExistingStub.resolves(undefined);
        attachProjectStub.resolves({
          success: true,
          projectId: '0Hn000000000001',
          pipelineId: '0XB000000000001',
        });

        await AddCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0XB000000000001',
          '--project-id',
          '0Hn000000000001',
        ]);

        expect(ctx.stdout).to.contain('Successfully attached project to pipeline');
        expect(ctx.stdout).to.contain('0Hn000000000001');
        expect(ctx.stdout).to.contain('0XB000000000001');
      });
  });

  describe('project already attached', () => {
    test
      .stdout()
      .stderr()
      .it('errors when project is already attached to another pipeline', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        findExistingStub.resolves('0XB000000000002');

        try {
          await AddCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--project-id',
            '0Hn000000000001',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already attached to pipeline');
        expect(ctx.stderr).to.contain('0XB000000000002');
      });
  });

  describe('attach failure', () => {
    test
      .stdout()
      .stderr()
      .it('shows failure error from sObject create', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        findExistingStub.resolves(undefined);
        attachProjectStub.resolves({
          success: false,
          projectId: '0Hn000000000001',
          pipelineId: '0XB000000000001',
          error: 'INVALID_CROSS_REFERENCE_KEY',
        });

        try {
          await AddCommand.run([
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

        expect(ctx.stderr).to.contain('Failed to attach project to pipeline');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        findExistingStub.rejects(new Error("sObject type 'DevopsProjectPipeline' is not supported"));

        try {
          await AddCommand.run([
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
        findExistingStub.rejects(new Error('Network error'));

        try {
          await AddCommand.run([
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
