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

import { expect } from '@oclif/test';
import sinon from 'sinon';
import { Connection } from '@salesforce/core';
import {
  addStageEnvironment,
  createEnvironment,
  getEnvironment,
  validateEnvironment,
  pollForAuthentication,
} from '../../src/utils/addStageEnvironment.js';

describe('addStageEnvironment utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;
  let requestStub: sinon.SinonStub;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');
    requestStub = sinon.stub();
    connectionStub.request = requestStub as unknown as typeof connectionStub.request;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createEnvironment', () => {
    it('calls POST /connect/devops/environment with correct body for Production', async () => {
      requestStub.resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        redirectUrl: 'https://login.salesforce.com/services/oauth2/authorize?...',
        namedCredential: 'Production_Org_NC',
        externalCredential: 'Production_Org_EC',
      });

      const result = await createEnvironment(connectionStub as unknown as Connection, {
        pipelineId: '0Xo000000000001',
        stageId: '0Xp000000000001',
        environmentName: 'Production_Org',
        orgType: 'Production',
      });

      expect(result.id).to.equal('0Hi000000000001');
      expect(result.name).to.equal('Production_Org');
      expect(result.redirectUrl).to.contain('login.salesforce.com');
      expect(result.namedCredential).to.equal('Production_Org_NC');

      const callArgs = requestStub.firstCall.args[0];
      expect(callArgs.url).to.contain('/connect/devops/environment');
      expect(callArgs.method).to.equal('POST');

      const body = JSON.parse(callArgs.body as string);
      expect(body.envName).to.equal('Production_Org');
      expect(body.orgType).to.equal('PRODUCTION');
      expect(body.pipelineStageId).to.equal('0Xp000000000001');
      expect(body.pipelineId).to.equal('0Xo000000000001');
    });

    it('sends orgType as SANDBOX for Sandbox input', async () => {
      requestStub.resolves({
        id: '0Hi000000000002',
        name: 'UAT_Sandbox',
        redirectUrl: 'https://test.salesforce.com/services/oauth2/authorize?...',
        namedCredential: 'UAT_Sandbox_NC',
        externalCredential: 'UAT_Sandbox_EC',
      });

      const result = await createEnvironment(connectionStub as unknown as Connection, {
        pipelineId: '0Xo000000000001',
        stageId: '0Xp000000000002',
        environmentName: 'UAT_Sandbox',
        orgType: 'Sandbox',
      });

      expect(result.name).to.equal('UAT_Sandbox');

      const callArgs = requestStub.firstCall.args[0];
      const body = JSON.parse(callArgs.body as string);
      expect(body.orgType).to.equal('SANDBOX');
    });

    it('propagates API errors', async () => {
      requestStub.rejects(new Error('Bad Request: Environment name already exists'));

      try {
        await createEnvironment(connectionStub as unknown as Connection, {
          pipelineId: '0Xo000000000001',
          stageId: '0Xp000000000001',
          environmentName: 'Duplicate_Env',
          orgType: 'Production',
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('already exists');
      }
    });
  });

  describe('getEnvironment', () => {
    it('calls GET /connect/devops/environment/{id}', async () => {
      requestStub.resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        organizationId: '00D000000000001',
        orgType: 'PRODUCTION',
      });

      const result = await getEnvironment(connectionStub as unknown as Connection, '0Hi000000000001');

      expect(result.id).to.equal('0Hi000000000001');
      expect(result.organizationId).to.equal('00D000000000001');

      const callArgs = requestStub.firstCall.args[0];
      expect(callArgs.url).to.contain('/connect/devops/environment/0Hi000000000001');
      expect(callArgs.method).to.equal('GET');
    });

    it('returns undefined organizationId when not yet authenticated', async () => {
      requestStub.resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
      });

      const result = await getEnvironment(connectionStub as unknown as Connection, '0Hi000000000001');
      expect(result.organizationId).to.be.undefined;
    });
  });

  describe('validateEnvironment', () => {
    it('calls PATCH /connect/devops/environment/{id} with empty body', async () => {
      requestStub.resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        organizationId: '00D000000000001',
        orgType: 'PRODUCTION',
        namedCredential: 'Production_Org_NC',
      });

      const result = await validateEnvironment(connectionStub as unknown as Connection, '0Hi000000000001');

      expect(result.organizationId).to.equal('00D000000000001');
      expect(result.namedCredential).to.equal('Production_Org_NC');

      const callArgs = requestStub.firstCall.args[0];
      expect(callArgs.url).to.contain('/connect/devops/environment/0Hi000000000001');
      expect(callArgs.method).to.equal('PATCH');
      expect(JSON.parse(callArgs.body as string)).to.deep.equal({});
    });

    it('propagates PATCH errors', async () => {
      requestStub.rejects(new Error('Validation failed: org not reachable'));

      try {
        await validateEnvironment(connectionStub as unknown as Connection, '0Hi000000000001');
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('org not reachable');
      }
    });
  });

  describe('pollForAuthentication', () => {
    it('resolves immediately when PATCH returns organizationId on first attempt', async () => {
      requestStub.resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        organizationId: '00D000000000001',
        namedCredential: 'Production_Org_NC',
      });

      const result = await pollForAuthentication(
        connectionStub as unknown as Connection,
        '0Hi000000000001',
        10_000,
        100
      );
      expect(result.organizationId).to.equal('00D000000000001');
    });

    it('retries PATCH when it throws (auth not yet complete)', async () => {
      requestStub.onFirstCall().rejects(new Error('Auth not complete'));
      requestStub.onSecondCall().rejects(new Error('Auth not complete'));
      requestStub.onThirdCall().resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        organizationId: '00D000000000001',
        namedCredential: 'Production_Org_NC',
      });

      const result = await pollForAuthentication(
        connectionStub as unknown as Connection,
        '0Hi000000000001',
        10_000,
        50
      );
      expect(result.organizationId).to.equal('00D000000000001');
      expect(requestStub.callCount).to.equal(3);
    });

    it('retries when PATCH succeeds but organizationId is not yet populated', async () => {
      requestStub.onFirstCall().resolves({ id: '0Hi000000000001', name: 'Production_Org' });
      requestStub.onSecondCall().resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        organizationId: '00D000000000001',
        namedCredential: 'Production_Org_NC',
      });

      const result = await pollForAuthentication(
        connectionStub as unknown as Connection,
        '0Hi000000000001',
        10_000,
        50
      );
      expect(result.organizationId).to.equal('00D000000000001');
      expect(requestStub.callCount).to.equal(2);
    });

    it('throws on timeout when auth never completes', async () => {
      requestStub.rejects(new Error('Auth not complete'));

      try {
        await pollForAuthentication(connectionStub as unknown as Connection, '0Hi000000000001', 200, 50);
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('timed out');
      }
    });
  });

  describe('addStageEnvironment (full orchestration)', () => {
    it('creates, polls via PATCH, and returns full result', async () => {
      // POST create
      requestStub.onFirstCall().resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        redirectUrl: 'https://login.salesforce.com/services/oauth2/authorize?client_id=abc',
        namedCredential: 'Production_Org_NC',
        externalCredential: 'Production_Org_EC',
      });

      // PATCH poll - first attempt: auth not done yet (throws)
      requestStub.onSecondCall().rejects(new Error('Auth not complete'));

      // PATCH poll - second attempt: auth complete, returns organizationId
      requestStub.onThirdCall().resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        organizationId: '00D000000000001',
        orgType: 'PRODUCTION',
        namedCredential: 'Production_Org_NC',
      });

      const onCreated = sinon.stub();

      const result = await addStageEnvironment({
        connection: connectionStub as unknown as Connection,
        pipelineId: '0Xo000000000001',
        stageId: '0Xp000000000001',
        environmentName: 'Production_Org',
        orgType: 'Production',
        onCreated,
        pollTimeoutMs: 10_000,
        pollIntervalMs: 50,
      });

      expect(result.success).to.be.true;
      expect(result.environmentId).to.equal('0Hi000000000001');
      expect(result.environmentName).to.equal('Production_Org');
      expect(result.organizationId).to.equal('00D000000000001');
      expect(result.redirectUrl).to.contain('login.salesforce.com');
      expect(result.namedCredential).to.equal('Production_Org_NC');

      expect(onCreated.calledOnce).to.be.true;
      expect(onCreated.firstCall.args[0].environmentId).to.equal('0Hi000000000001');
      expect(onCreated.firstCall.args[0].redirectUrl).to.contain('login.salesforce.com');
    });

    it('throws timeout error when auth never completes', async () => {
      // POST create succeeds
      requestStub.onFirstCall().resolves({
        id: '0Hi000000000001',
        name: 'Production_Org',
        redirectUrl: 'https://login.salesforce.com/...',
        namedCredential: 'Production_Org_NC',
        externalCredential: 'Production_Org_EC',
      });

      // PATCH poll - always throws (auth never completes)
      requestStub.onSecondCall().rejects(new Error('Auth not complete'));
      requestStub.onThirdCall().rejects(new Error('Auth not complete'));
      requestStub.onCall(3).rejects(new Error('Auth not complete'));
      requestStub.onCall(4).rejects(new Error('Auth not complete'));
      requestStub.onCall(5).rejects(new Error('Auth not complete'));
      requestStub.onCall(6).rejects(new Error('Auth not complete'));

      try {
        await addStageEnvironment({
          connection: connectionStub as unknown as Connection,
          pipelineId: '0Xo000000000001',
          stageId: '0Xp000000000001',
          environmentName: 'Production_Org',
          orgType: 'Production',
          pollTimeoutMs: 200,
          pollIntervalMs: 50,
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('timed out');
      }
    });

    it('propagates connection errors during create', async () => {
      requestStub.rejects(new Error('Network timeout'));

      try {
        await addStageEnvironment({
          connection: connectionStub as unknown as Connection,
          pipelineId: '0Xo000000000001',
          stageId: '0Xp000000000001',
          environmentName: 'Production_Org',
          orgType: 'Sandbox',
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('Network timeout');
      }
    });
  });
});
