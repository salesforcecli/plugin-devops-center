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

describe('devops pipeline stage update', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let UpdateCommand: any;
  const updateStub = sinon.stub();
  const mockConnection = {
    getApiVersion: () => '65.0',
    sobject: sinon.stub().returns({ update: updateStub }),
  };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };

  before(async () => {
    const mod = await esmock('../../../../../src/commands/devops/pipeline/stage/update.js', {});
    UpdateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    updateStub.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockConnection.sobject as any).resetHistory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(mockOrg);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful update', () => {
    test
      .stdout()
      .stderr()
      .it('updates stage name and prints result', async (ctx) => {
        updateStub.resolves({ id: '1QVxx0000000001', success: true });

        const result = await UpdateCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000001', '-n', 'Integration']);

        expect(ctx.stdout).to.contain('Successfully updated stage "Integration"');
        expect(ctx.stdout).to.contain('1QVxx0000000001');
        expect(result.success).to.be.true;
        expect(result.stageId).to.equal('1QVxx0000000001');
        expect(result.name).to.equal('Integration');

        const updateArg = updateStub.firstCall.args[0] as Record<string, unknown>;
        expect(updateArg.Id).to.equal('1QVxx0000000001');
        expect(updateArg.Name).to.equal('Integration');
      });
  });

  describe('stage not found', () => {
    test
      .stdout()
      .stderr()
      .it('errors when stage is not found', async (ctx) => {
        updateStub.rejects(new Error('entity is deleted'));

        try {
          await UpdateCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000001', '-n', 'Integration']);
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
        updateStub.rejects(new Error("sObject type 'DevopsPipelineStage' is not supported"));

        try {
          await UpdateCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000001', '-n', 'Integration']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });
  });

  describe('unexpected error', () => {
    test
      .stdout()
      .stderr()
      .it('rethrows unexpected errors', async () => {
        updateStub.rejects(new Error('Connection refused'));

        try {
          await UpdateCommand.run(['-o', 'testOrg', '-s', '1QVxx0000000001', '-n', 'Integration']);
          expect.fail('should have thrown');
        } catch (e: unknown) {
          expect((e as Error).message).to.contain('Connection refused');
        }
      });
  });
});
