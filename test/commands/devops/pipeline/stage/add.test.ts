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

describe('devops pipeline stage add', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let AddCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const addPipelineStageStub = sinon.stub();
  const fetchPipelineStagesStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/pipeline/stage/add.js', {
      '../../../../../src/utils/addPipelineStage.js': {
        addPipelineStage: addPipelineStageStub,
      },
      '../../../../../src/utils/pipelineUtils.js': {
        fetchPipelineStages: fetchPipelineStagesStub,
      },
    });
    AddCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    addPipelineStageStub.reset();
    fetchPipelineStagesStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful stage addition', () => {
    test
      .stdout()
      .stderr()
      .it('adds stage and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xc000000000002', Name: 'Integration' }]);
        addPipelineStageStub.resolves({
          success: true,
          stageId: '0Xc000000000005',
          name: 'Development',
          nextStageId: '0Xc000000000002',
          pipelineId: '0XB000000000001',
        });

        await AddCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0XB000000000001',
          '--name',
          'Development',
          '--next-stage-id',
          '0Xc000000000002',
        ]);

        expect(ctx.stdout).to.contain('Successfully added stage "Development" to the pipeline.');
        expect(ctx.stdout).to.contain('0Xc000000000005');
        expect(ctx.stdout).to.contain('0XB000000000001');
      });
  });

  describe('stage not found error', () => {
    test
      .stdout()
      .stderr()
      .it('shows friendly error when next stage not found', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xc000000000002', Name: 'Integration' }]);

        try {
          await AddCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--name',
            'Development',
            '--next-stage-id',
            '0Xc000000000099',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('not found in pipeline');
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
          await AddCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--name',
            'Development',
            '--next-stage-id',
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
        fetchPipelineStagesStub.resolves([{ Id: '0Xc000000000002', Name: 'Integration' }]);
        addPipelineStageStub.rejects(new Error('Network error'));

        try {
          await AddCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0XB000000000001',
            '--name',
            'Development',
            '--next-stage-id',
            '0Xc000000000002',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
