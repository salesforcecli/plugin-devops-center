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
import { assertStatusTransitionAllowed, updateWorkItem } from '../../src/utils/updateWorkItem.js';

describe('updateWorkItem status transition guard', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;
  const workItemId = '0Wx000000000001';
  const projectId = '1Qg000000000001';

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('assertStatusTransitionAllowed', () => {
    it('allows IN_PROGRESS when the work item is NEW', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [{ Status: 'NEW' }] });

      await assertStatusTransitionAllowed(connectionStub as unknown as Connection, workItemId, 'IN_PROGRESS');

      const soql = (connectionStub.query as sinon.SinonStub).firstCall.args[0] as string;
      expect(soql).to.contain('SELECT Status FROM WorkItem');
      expect(soql).to.contain(`Id = '${workItemId}'`);
    });

    it('blocks IN_PROGRESS when the work item is not NEW', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [{ Status: 'IN_PROGRESS' }] });

      try {
        await assertStatusTransitionAllowed(connectionStub as unknown as Connection, workItemId, 'IN_PROGRESS');
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('currently IN_PROGRESS');
        expect((e as Error).message).to.contain('only allowed from NEW');
      }
    });

    it('allows READY_TO_PROMOTE when the work item is IN_REVIEW', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [{ Status: 'IN_REVIEW' }] });

      await assertStatusTransitionAllowed(connectionStub as unknown as Connection, workItemId, 'READY_TO_PROMOTE');
    });

    it('blocks READY_TO_PROMOTE when the work item is not IN_REVIEW', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [{ Status: 'NEW' }] });

      try {
        await assertStatusTransitionAllowed(connectionStub as unknown as Connection, workItemId, 'READY_TO_PROMOTE');
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('currently NEW');
        expect((e as Error).message).to.contain('only allowed from IN_REVIEW');
      }
    });

    it('does not query for a target status with no precondition', async () => {
      await assertStatusTransitionAllowed(connectionStub as unknown as Connection, workItemId, 'CLOSED');

      expect((connectionStub.query as sinon.SinonStub).called).to.be.false;
    });

    it('throws when the work item is not found', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [] });

      try {
        await assertStatusTransitionAllowed(connectionStub as unknown as Connection, workItemId, 'IN_PROGRESS');
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('not found');
      }
    });
  });

  describe('updateWorkItem', () => {
    it('blocks the PATCH when the transition is invalid', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [{ Status: 'IN_PROGRESS' }] });

      try {
        await updateWorkItem({
          connection: connectionStub as unknown as Connection,
          workItemId,
          projectId,
          status: 'In Progress',
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('Cannot change status');
      }

      expect((connectionStub.request as sinon.SinonStub).called).to.be.false;
    });

    it('sends the PATCH when the transition is valid', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [{ Status: 'NEW' }] });
      (connectionStub.request as sinon.SinonStub).resolves({ status: 'IN_PROGRESS' });

      const result = await updateWorkItem({
        connection: connectionStub as unknown as Connection,
        workItemId,
        projectId,
        status: 'In Progress',
      });

      expect(result.success).to.be.true;
      const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
      expect(callArgs.method).to.equal('PATCH');
      const body = JSON.parse(callArgs.body as string) as Record<string, unknown>;
      expect(body.status).to.equal('IN_PROGRESS');
    });

    it('updates subject/description via the sObject API, not the connect endpoint', async () => {
      const updateStub = sinon.stub().resolves({ id: workItemId, success: true, errors: [] });
      (connectionStub.sobject as sinon.SinonStub).returns({ update: updateStub });

      const result = await updateWorkItem({
        connection: connectionStub as unknown as Connection,
        workItemId,
        projectId,
        subject: 'New subject',
        description: 'New description',
      });

      expect((connectionStub.sobject as sinon.SinonStub).calledWith('WorkItem')).to.be.true;
      expect(updateStub.firstCall.args[0]).to.deep.equal({
        Id: workItemId,
        Subject: 'New subject',
        Description: 'New description',
      });
      // No status change → no status query and no connect PATCH.
      expect((connectionStub.query as sinon.SinonStub).called).to.be.false;
      expect((connectionStub.request as sinon.SinonStub).called).to.be.false;
      expect(result).to.deep.include({ success: true, subject: 'New subject', description: 'New description' });
    });

    it('returns a failure result when the sObject update fails', async () => {
      const updateStub = sinon.stub().resolves({ id: workItemId, success: false, errors: [{ message: 'boom' }] });
      (connectionStub.sobject as sinon.SinonStub).returns({ update: updateStub });

      const result = await updateWorkItem({
        connection: connectionStub as unknown as Connection,
        workItemId,
        projectId,
        description: 'New description',
      });

      expect(result.success).to.be.false;
      expect(result.error).to.contain('boom');
    });

    it('updates both fields and status in a single call', async () => {
      const updateStub = sinon.stub().resolves({ id: workItemId, success: true, errors: [] });
      (connectionStub.sobject as sinon.SinonStub).returns({ update: updateStub });
      (connectionStub.query as sinon.SinonStub).resolves({ records: [{ Status: 'NEW' }] });
      (connectionStub.request as sinon.SinonStub).resolves({ success: 'true' });

      const result = await updateWorkItem({
        connection: connectionStub as unknown as Connection,
        workItemId,
        projectId,
        subject: 'New subject',
        status: 'In Progress',
      });

      expect(updateStub.calledOnce).to.be.true;
      expect((connectionStub.request as sinon.SinonStub).calledOnce).to.be.true;
      expect(result.status).to.equal('IN_PROGRESS');
      expect(result.subject).to.equal('New subject');
    });
  });
});
