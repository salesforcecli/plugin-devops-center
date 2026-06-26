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

describe('devops pipeline activate', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ActivateCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const activatePipelineStub = sinon.stub();
  const fetchPipelineStagesStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/pipeline/activate.js', {
      '../../../../src/utils/activatePipeline.js': {
        activatePipeline: activatePipelineStub,
      },
      '../../../../src/utils/pipelineUtils.js': {
        fetchPipelineStages: fetchPipelineStagesStub,
      },
    });
    ActivateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    activatePipelineStub.reset();
    fetchPipelineStagesStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful activation', () => {
    test
      .stdout()
      .stderr()
      .it('activates pipeline and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([
          { Id: '1', Name: 'Integration' },
          { Id: '2', Name: 'UAT' },
          { Id: '3', Name: 'Production' },
        ]);
        activatePipelineStub.resolves({
          success: true,
          pipelineId: '0XB000000000001',
          status: 'Active',
        });

        await ActivateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001']);

        expect(ctx.stdout).to.contain('Successfully activated the pipeline.');
        expect(ctx.stdout).to.contain('0XB000000000001');
        expect(ctx.stdout).to.contain('Active');
        expect(ctx.stdout).to.contain('3');
      });
  });

  describe('no stages error', () => {
    test
      .stdout()
      .stderr()
      .it('errors when pipeline has no stages', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([]);

        try {
          await ActivateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Add at least one stage');
      });
  });

  describe('already active error', () => {
    test
      .stdout()
      .stderr()
      .it('errors when pipeline is already active', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '1', Name: 'Integration' }]);
        activatePipelineStub.rejects(new Error('Pipeline is already active'));

        try {
          await ActivateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already active');
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
          await ActivateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001']);
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
        fetchPipelineStagesStub.resolves([{ Id: '1', Name: 'Integration' }]);
        activatePipelineStub.rejects(new Error('Network error'));

        try {
          await ActivateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
