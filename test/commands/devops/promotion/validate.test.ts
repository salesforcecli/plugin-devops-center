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

describe('devops promotion validate', () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ValidateCommand: any;
  const validatePromotionStub = sinon.stub();
  const resolveProjectIdFromWorkItemStub = sinon.stub();
  const getPipelineIdForProjectStub = sinon.stub();
  const mockConnection = { getApiVersion: () => '65.0' };
  const mockOrg = { id: '1', getOrgId: () => '1', getConnection: () => mockConnection };

  before(async () => {
    const mod = await esmock('../../../../src/commands/devops/promotion/validate.js', {
      '../../../../src/utils/promotionUtils.js': {
        validatePromotion: validatePromotionStub,
      },
      '../../../../src/utils/prepareWorkItem.js': {
        resolveProjectIdFromWorkItem: resolveProjectIdFromWorkItemStub,
      },
      '../../../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: getPipelineIdForProjectStub,
      },
    });
    ValidateCommand = mod.default;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    validatePromotionStub.reset();
    resolveProjectIdFromWorkItemStub.reset();
    getPipelineIdForProjectStub.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(mockOrg);
  });

  afterEach(() => {
    sandbox.restore();
  });

  // ── Successful validation ─────────────────────────────────────────────────

  describe('successful validation', () => {
    test
      .stdout()
      .stderr()
      .it('prints success and returns result', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: true,
          errorType: null,
          errorDetails: null,
          combineDetails: null,
        });

        const result = await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);

        expect(ctx.stdout).to.contain('Success:      true');
        expect(result.success).to.be.true;
        expect(result.errorType).to.be.null;
        expect(result.combineDetails).to.be.null;
      });

    test
      .stdout()
      .stderr()
      .it('validates multiple work items', async () => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({ success: true, errorType: null, errorDetails: null, combineDetails: null });

        await ValidateCommand.run([
          '-o',
          'testOrg',
          '-i',
          '1fkxx0000000001',
          '-i',
          '1fkxx0000000002',
          '-t',
          '1QVxx0000000003',
        ]);

        const args = validatePromotionStub.firstCall.args;
        expect(args[2]).to.deep.equal(['1fkxx0000000001', '1fkxx0000000002']);
        expect(args[3]).to.equal('1QVxx0000000003');
      });

    test
      .stdout()
      .stderr()
      .it('prints combine details when present', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: true,
          errorType: null,
          errorDetails: null,
          combineDetails: { sharedComponents: ['ComponentA'] },
        });

        const result = await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);

        expect(ctx.stdout).to.contain('Combine Details');
        expect(ctx.stdout).to.contain('ComponentA');
        expect(result.combineDetails).to.deep.equal({ sharedComponents: ['ComponentA'] });
      });
  });

  // ── Validation failures from API ──────────────────────────────────────────

  describe('API returns success: false', () => {
    test
      .stdout()
      .stderr()
      .it('errors with errorType and errorDetails when validation fails', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: false,
          errorType: 'TARGET_ORG_AUTH_MISSING',
          errorDetails: 'User does not have a valid session to target stage organization',
          combineDetails: null,
        });

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('TARGET_ORG_AUTH_MISSING');
        expect(ctx.stderr).to.contain('valid session');
      });

    test
      .stdout()
      .stderr()
      .it('errors with vcsPermission error type', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.resolves({
          success: false,
          errorType: 'vcsPermission',
          errorDetails: 'Missing VCS permissions',
          combineDetails: null,
        });

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('vcsPermission');
      });
  });

  // ── Pipeline resolution errors ────────────────────────────────────────────

  describe('pipeline resolution errors', () => {
    test
      .stdout()
      .stderr()
      .it('errors when no pipeline is found for the work item', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves(null);

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('No pipeline found');
      });

    test
      .stdout()
      .stderr()
      .it('errors when work item is not found', async (ctx) => {
        resolveProjectIdFromWorkItemStub.rejects(
          new Error("Work item '1fkxx0000000099' not found. Verify the work item ID and try again.")
        );

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000099', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('not found');
      });
  });

  // ── DevOps Center not enabled ─────────────────────────────────────────────

  describe('DevOps Center not enabled', () => {
    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error when org query fails', async (ctx) => {
        resolveProjectIdFromWorkItemStub.rejects(new Error("sObject type 'DevopsPipelineStage' is not supported"));

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });

    test
      .stdout()
      .stderr()
      .it('shows DevOps Center not enabled error when validatePromotion throws', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.rejects(new Error("sObject type 'DevopsPromotionRequest' is not supported"));

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain("DevOps Center isn't enabled");
      });
  });

  // ── HTTP-level request failures ───────────────────────────────────────────

  describe('request failures', () => {
    test
      .stdout()
      .stderr()
      .it('surfaces a clean error when the API request throws', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.rejects(new Error('Network timeout'));

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Network timeout');
      });

    test
      .stdout()
      .stderr()
      .it('strips HTML from error messages', async (ctx) => {
        resolveProjectIdFromWorkItemStub.resolves({ projectId: 'PROJ001', pipelineStageId: '' });
        getPipelineIdForProjectStub.resolves('PIPE001');
        validatePromotionStub.rejects(new Error('Bad Request<br/><b>Extra HTML detail</b>'));

        try {
          await ValidateCommand.run(['-o', 'testOrg', '-i', '1fkxx0000000001', '-t', '1QVxx0000000003']);
          expect.fail('should have thrown');
        } catch (e) {
          // expected
        }

        expect(ctx.stderr).to.contain('Bad Request');
        expect(ctx.stderr).to.not.contain('<br/>');
      });
  });
});
