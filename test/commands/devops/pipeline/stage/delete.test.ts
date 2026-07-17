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

describe('devops pipeline stage delete', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DeleteCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const deletePipelineStageStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/pipeline/stage/delete.js', {
      '../../../../../src/utils/deletePipelineStage.js': {
        deletePipelineStage: deletePipelineStageStub,
      },
    });
    DeleteCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    deletePipelineStageStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful deletion', () => {
    test
      .stdout()
      .stderr()
      .it('logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        deletePipelineStageStub.resolves({
          success: true,
          stageId: '0Xc000000000002',
          pipelineId: '0XB000000000001',
        });

        await DeleteCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0XB000000000001',
          '--stage-id',
          '0Xc000000000002',
        ]);

        expect(ctx.stdout).to.contain('Successfully deleted stage 0Xc000000000002');
        expect(ctx.stdout).to.contain('0XB000000000001');
      });
  });

  describe('stage not found', () => {
    test
      .stdout()
      .stderr()
      .it('shows stage not found error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        deletePipelineStageStub.rejects(new Error('Stage not found: 0Xc000000000099'));

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--stage-id',
            '0Xc000000000099',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('not found in pipeline');
      });
  });

  describe('deletion failure', () => {
    test
      .stdout()
      .stderr()
      .it('shows failure error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        deletePipelineStageStub.resolves({
          success: false,
          error: 'ENTITY_IS_LOCKED',
        });

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--stage-id',
            '0Xc000000000002',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Failed to delete stage');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        deletePipelineStageStub.rejects(new Error("sObject type 'DevopsPipelineStage' is not supported"));

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--stage-id',
            '0Xc000000000002',
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
        deletePipelineStageStub.rejects(new Error('Network error'));

        try {
          await DeleteCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--stage-id',
            '0Xc000000000002',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
