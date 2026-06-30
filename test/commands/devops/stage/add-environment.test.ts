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

describe('devops stage add-environment', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let AddEnvironmentCommand: any;
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection, getUsername: () => 'testOrg' };
  const addStageEnvironmentStub = sinon.stub();
  const fetchPipelineStagesStub = sinon.stub();
  const execStub = sinon.stub();

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/stage/add-environment.js', {
      '../../../../src/utils/addStageEnvironment.js': {
        addStageEnvironment: addStageEnvironmentStub,
      },
      '../../../../src/utils/pipelineUtils.js': {
        fetchPipelineStages: fetchPipelineStagesStub,
      },
      'node:child_process': {
        exec: execStub,
      },
    });
    AddEnvironmentCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    addStageEnvironmentStub.reset();
    fetchPipelineStagesStub.reset();
    execStub.reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful environment creation with full auth flow', () => {
    test
      .stdout()
      .stderr()
      .it('creates environment, opens browser, and logs success with organizationId', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);
        addStageEnvironmentStub.callsFake(
          async (params: { onCreated?: (data: { environmentId: string; redirectUrl: string }) => void }) => {
            if (params.onCreated) {
              params.onCreated({
                environmentId: '0Hi000000000001',
                redirectUrl: 'https://login.salesforce.com/services/oauth2/authorize?client_id=abc',
              });
            }
            return {
              success: true,
              stageId: '0Xp000000000001',
              environmentId: '0Hi000000000001',
              environmentName: 'Production_Org',
              orgType: 'Production',
              pipelineId: '0Xo000000000001',
              redirectUrl: 'https://login.salesforce.com/services/oauth2/authorize?client_id=abc',
              namedCredential: 'Production_Org_NC',
              organizationId: '00D000000000001',
            };
          }
        );

        await AddEnvironmentCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000001',
          '--environment-name',
          'Production_Org',
          '--org-type',
          'Production',
        ]);

        expect(ctx.stdout).to.contain('Successfully created and authenticated the environment.');
        expect(ctx.stdout).to.contain('0Xp000000000001');
        expect(ctx.stdout).to.contain('0Hi000000000001');
        expect(ctx.stdout).to.contain('Production_Org');
        expect(ctx.stdout).to.contain('00D000000000001');
      });
  });

  describe('--no-browser flag', () => {
    test
      .stdout()
      .stderr()
      .it('prints redirect URL instead of opening browser when --no-browser is set', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);
        addStageEnvironmentStub.callsFake(
          async (params: { onCreated?: (data: { environmentId: string; redirectUrl: string }) => void }) => {
            if (params.onCreated) {
              params.onCreated({
                environmentId: '0Hi000000000001',
                redirectUrl: 'https://login.salesforce.com/services/oauth2/authorize?client_id=abc',
              });
            }
            return {
              success: true,
              stageId: '0Xp000000000001',
              environmentId: '0Hi000000000001',
              environmentName: 'Production_Org',
              orgType: 'Production',
              pipelineId: '0Xo000000000001',
              redirectUrl: 'https://login.salesforce.com/services/oauth2/authorize?client_id=abc',
              namedCredential: 'Production_Org_NC',
              organizationId: '00D000000000001',
            };
          }
        );

        await AddEnvironmentCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000001',
          '--environment-name',
          'Production_Org',
          '--org-type',
          'Production',
          '--no-browser',
        ]);

        expect(ctx.stdout).to.contain('Open the following URL');
        expect(ctx.stdout).to.contain('login.salesforce.com');
        expect(ctx.stdout).to.contain('Successfully created and authenticated the environment.');
      });
  });

  describe('sandbox environment creation', () => {
    test
      .stdout()
      .stderr()
      .it('creates sandbox environment and logs success', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000002', Name: 'UAT' }]);
        addStageEnvironmentStub.callsFake(
          async (params: { onCreated?: (data: { environmentId: string; redirectUrl: string }) => void }) => {
            if (params.onCreated) {
              params.onCreated({
                environmentId: '0Hi000000000002',
                redirectUrl: 'https://test.salesforce.com/services/oauth2/authorize?...',
              });
            }
            return {
              success: true,
              stageId: '0Xp000000000002',
              environmentId: '0Hi000000000002',
              environmentName: 'UAT_Sandbox',
              orgType: 'Sandbox',
              pipelineId: '0Xo000000000001',
              redirectUrl: 'https://test.salesforce.com/services/oauth2/authorize?...',
              namedCredential: 'UAT_Sandbox_NC',
              organizationId: '00D000000000002',
            };
          }
        );

        await AddEnvironmentCommand.run([
          '--target-org',
          'testOrg',
          '--pipeline-id',
          '0Xo000000000001',
          '--stage-id',
          '0Xp000000000002',
          '--environment-name',
          'UAT_Sandbox',
          '--org-type',
          'Sandbox',
        ]);

        expect(ctx.stdout).to.contain('Successfully created and authenticated the environment.');
        expect(ctx.stdout).to.contain('UAT_Sandbox');
        expect(ctx.stdout).to.contain('00D000000000002');
      });
  });

  describe('stage not found error', () => {
    test
      .stdout()
      .stderr()
      .it('shows friendly error when stage not found in pipeline', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);

        try {
          await AddEnvironmentCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000099',
            '--environment-name',
            'Production_Org',
            '--org-type',
            'Production',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("doesn't exist in pipeline");
      });
  });

  describe('authentication timeout', () => {
    test
      .stdout()
      .stderr()
      .it('shows timeout error when authentication does not complete', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);
        addStageEnvironmentStub.rejects(
          new Error('Authentication timed out after 300 seconds. Re-run the command or authenticate manually.')
        );

        try {
          await AddEnvironmentCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
            '--environment-name',
            'Production_Org',
            '--org-type',
            'Production',
          ]);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('timed out');
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
          await AddEnvironmentCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
            '--environment-name',
            'Production_Org',
            '--org-type',
            'Sandbox',
          ]);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });
  });

  describe('rethrows API errors', () => {
    test
      .stdout()
      .stderr()
      .it('rethrows errors from addStageEnvironment', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        fetchPipelineStagesStub.resolves([{ Id: '0Xp000000000001', Name: 'Production' }]);
        addStageEnvironmentStub.rejects(new Error('Bad Request: Environment name already exists'));

        try {
          await AddEnvironmentCommand.run([
            '--target-org',
            'testOrg',
            '--pipeline-id',
            '0Xo000000000001',
            '--stage-id',
            '0Xp000000000001',
            '--environment-name',
            'Duplicate_Env',
            '--org-type',
            'Production',
          ]);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('already exists');
        }
      });
  });
});
