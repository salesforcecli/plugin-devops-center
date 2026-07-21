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

describe('devops deploy', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DeployCommand: any;
  const getUndeployedWorkItemsStub = sinon.stub();
  const validateDeployStub = sinon.stub();
  const executeDeployStub = sinon.stub();
  const mockConnection = {
    getApiVersion: () => '65.0',
    query: sinon.stub().resolves({ records: [{ DevopsPipelineId: '0Xo000000000001' }] }),
  };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };

  before(async () => {
    const mod = await esmock('../../../src/commands/devops/deploy.js', {
      '../../../src/utils/deployStage.js': {
        getUndeployedWorkItems: getUndeployedWorkItemsStub,
        validateDeploy: validateDeployStub,
        executeDeploy: executeDeployStub,
      },
    });
    DeployCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    getUndeployedWorkItemsStub.reset();
    validateDeployStub.reset();
    executeDeployStub.reset();
    mockConnection.query.resetHistory();
    mockConnection.query.resolves({ records: [{ DevopsPipelineId: '0Xo000000000001' }] });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful deploy', () => {
    test
      .stdout()
      .stderr()
      .it('deploys undeployed work items and prints result', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getUndeployedWorkItemsStub.resolves({ undeployedWorkitemIds: ['a1B000000000001', 'a1B000000000002'] });
        validateDeployStub.resolves({ success: true, errorType: null, errorDetails: null });
        executeDeployStub.resolves({
          requestId: 'req-token-001',
          status: 'SUBMITTED',
          message: 'Submitted for promotion',
          promotedWorkitemIds: ['a1B000000000001', 'a1B000000000002'],
        });

        const result = await DeployCommand.run(['-o', 'testOrg', '-t', '1QVxx0000000001']);

        expect(ctx.stdout).to.contain('SUBMITTED');
        expect(ctx.stdout).to.contain('req-token-001');
        expect(result.undeployedWorkitemIds).to.deep.equal(['a1B000000000001', 'a1B000000000002']);
        expect(result.promotedWorkitemIds).to.deep.equal(['a1B000000000001', 'a1B000000000002']);
        expect(executeDeployStub.calledOnce).to.be.true;
      });
  });

  describe('nothing to deploy', () => {
    test
      .stdout()
      .stderr()
      .it('exits with no-op when no undeployed work items exist', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getUndeployedWorkItemsStub.resolves({ undeployedWorkitemIds: [] });

        const result = await DeployCommand.run(['-o', 'testOrg', '-t', '1QVxx0000000001']);

        expect(ctx.stdout).to.contain('No undeployed work items found for this stage.');
        expect(result.status).to.equal('NoOp');
        expect(validateDeployStub.called).to.be.false;
        expect(executeDeployStub.called).to.be.false;
      });
  });

  describe('validation failure', () => {
    test
      .stdout()
      .stderr()
      .it('errors and does not deploy when validation fails', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getUndeployedWorkItemsStub.resolves({ undeployedWorkitemIds: ['a1B000000000001'] });
        validateDeployStub.resolves({
          success: false,
          errorType: 'CONFLICT',
          errorDetails: 'Work item has conflicting components',
        });

        try {
          await DeployCommand.run(['-o', 'testOrg', '-t', '1QVxx0000000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('validation failed');
        expect(executeDeployStub.called).to.be.false;
      });
  });

  describe('stage not found', () => {
    test
      .stdout()
      .stderr()
      .it('errors when stage has no associated pipeline', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockConnection.query.resolves({ records: [] });

        try {
          await DeployCommand.run(['-o', 'testOrg', '-t', '1QVxx0000000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('not found');
      });
  });

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        mockConnection.query.rejects(new Error("sObject type 'DevopsPipelineStage' is not supported"));

        try {
          await DeployCommand.run(['-o', 'testOrg', '-t', '1QVxx0000000001']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });
  });

  describe('deploy execution failure', () => {
    test
      .stdout()
      .stderr()
      .it('surfaces a clean error message on deploy failure', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(Org, 'create' as any).returns(mockOrg);
        getUndeployedWorkItemsStub.resolves({ undeployedWorkitemIds: ['a1B000000000001'] });
        validateDeployStub.resolves({ success: true, errorType: null, errorDetails: null });
        executeDeployStub.rejects(new Error('Invalid stage configuration'));

        try {
          await DeployCommand.run(['-o', 'testOrg', '-t', '1QVxx0000000001']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Invalid stage configuration');
      });
  });
});
