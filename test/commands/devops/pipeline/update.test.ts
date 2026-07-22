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

describe('devops pipeline update', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let UpdateCommand: any;

  const sobjectUpdateStub = sinon.stub().resolves({ id: '0XB000000000001', success: true, errors: [] });
  const mockSobject = { update: sobjectUpdateStub };
  const queryStub = sinon.stub().resolves({ records: [{ IsActive: false, Name: 'My Pipeline' }] });
  const mockConnection = {
    getApiVersion: () => '65.0',
    query: queryStub,
    sobject: () => mockSobject,
  };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const activatePipelineStub = sinon.stub();
  const updatePipelineRecordStub = sinon.stub();
  const fetchPipelineStagesStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/pipeline/update.js', {
      '../../../../src/utils/activatePipeline.js': {
        activatePipeline: activatePipelineStub,
        updatePipelineRecord: updatePipelineRecordStub,
      },
      '../../../../src/utils/pipelineUtils.js': {
        fetchPipelineStages: fetchPipelineStagesStub,
      },
    });
    UpdateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    activatePipelineStub.reset();
    updatePipelineRecordStub.reset();
    fetchPipelineStagesStub.reset();
    queryStub.reset();
    queryStub.resolves({ records: [{ IsActive: false, Name: 'My Pipeline' }] });
    updatePipelineRecordStub.resolves();
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
        activatePipelineStub.resolves({ success: true, pipelineId: '0XB000000000001', status: 'Active' });

        await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--active']);

        expect(ctx.stdout).to.contain('Successfully activated the pipeline.');
        expect(ctx.stdout).to.contain('0XB000000000001');
        expect(ctx.stdout).to.contain('Active');
        expect(ctx.stdout).to.contain('3');
      });
  });

  describe('successful deactivation', () => {
    test
      .stdout()
      .stderr()
      .it('deactivates pipeline via record API and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '1', Name: 'Integration' }]);
        queryStub.resolves({ records: [{ IsActive: true, Name: 'My Pipeline' }] });

        await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--no-active']);

        expect(ctx.stdout).to.contain('Successfully deactivated the pipeline.');
        expect(ctx.stdout).to.contain('0XB000000000001');
        expect(ctx.stdout).to.contain('Inactive');
        expect(updatePipelineRecordStub.calledOnce).to.be.true;
        expect(updatePipelineRecordStub.firstCall.args[2]).to.deep.equal({ IsActive: false });
      });
  });

  describe('successful rename', () => {
    test
      .stdout()
      .stderr()
      .it('renames pipeline via record API and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '1', Name: 'Integration' }]);

        await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--name', 'New Name']);

        expect(ctx.stdout).to.contain('Successfully renamed the pipeline to "New Name".');
        expect(ctx.stdout).to.contain('New Name');
        expect(updatePipelineRecordStub.calledOnce).to.be.true;
        expect(updatePipelineRecordStub.firstCall.args[2]).to.deep.equal({ Name: 'New Name' });
      });
  });

  describe('deactivate and rename together', () => {
    test
      .stdout()
      .stderr()
      .it('deactivates and renames in one record API call', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '1', Name: 'Integration' }]);
        queryStub.resolves({ records: [{ IsActive: true, Name: 'My Pipeline' }] });

        await UpdateCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0XB000000000001',
          '--no-active',
          '--name',
          'Archived Pipeline',
        ]);

        expect(ctx.stdout).to.contain('Successfully deactivated the pipeline.');
        expect(ctx.stdout).to.contain('Successfully renamed the pipeline to "Archived Pipeline".');
        expect(updatePipelineRecordStub.calledOnce).to.be.true;
        expect(updatePipelineRecordStub.firstCall.args[2]).to.deep.equal({
          IsActive: false,
          Name: 'Archived Pipeline',
        });
      });
  });

  describe('no flags error', () => {
    test
      .stdout()
      .stderr()
      .it('errors when neither --active nor --name is provided', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '1', Name: 'Integration' }]);

        try {
          await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Provide at least one');
      });
  });

  describe('no stages error on activate', () => {
    test
      .stdout()
      .stderr()
      .it('errors when pipeline has no stages', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([]);

        try {
          await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--active']);
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
        queryStub.resolves({ records: [{ IsActive: true, Name: 'My Pipeline' }] });

        try {
          await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--active']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already active');
      });
  });

  describe('already inactive error', () => {
    test
      .stdout()
      .stderr()
      .it('errors when pipeline is already inactive', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '1', Name: 'Integration' }]);
        queryStub.resolves({ records: [{ IsActive: false, Name: 'My Pipeline' }] });

        try {
          await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--no-active']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('already inactive');
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
          await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--active']);
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
          await UpdateCommand.run(['--target-org', 'testOrg', '--pipeline-id', '0XB000000000001', '--active']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Network error');
        }
      });
  });
});
