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
import { attachProject, findExistingAttachment } from '../../src/utils/attachProject.js';

describe('attachProject utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;
  let sobjectStub: sinon.SinonStub;
  let createStub: sinon.SinonStub;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    createStub = sinon.stub();
    sobjectStub = sinon.stub().returns({ create: createStub });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionStub as any).sobject = sobjectStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('findExistingAttachment', () => {
    it('returns pipeline ID when project is already attached', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (connectionStub.query as any).resolves({
        records: [{ DevopsPipelineId: '0XB000000000002' }],
      });

      const result = await findExistingAttachment(connectionStub as unknown as Connection, '0Hn000000000001');

      expect(result).to.equal('0XB000000000002');
    });

    it('returns undefined when project is not attached', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (connectionStub.query as any).resolves({ records: [] });

      const result = await findExistingAttachment(connectionStub as unknown as Connection, '0Hn000000000001');

      expect(result).to.be.undefined;
    });
  });

  describe('attachProject', () => {
    it('returns success when junction record is created', async () => {
      createStub.resolves({ success: true, id: 'JCT001', errors: [] });

      const result = await attachProject({
        connection: connectionStub as unknown as Connection,
        projectId: '0Hn000000000001',
        pipelineId: '0XB000000000001',
      });

      expect(result.success).to.be.true;
      expect(result.projectId).to.equal('0Hn000000000001');
      expect(result.pipelineId).to.equal('0XB000000000001');
      expect(sobjectStub.calledWith('DevopsProjectPipeline')).to.be.true;
    });

    it('returns error on sObject create failure', async () => {
      createStub.resolves({ success: false, id: null, errors: ['DUPLICATE_VALUE'] });

      const result = await attachProject({
        connection: connectionStub as unknown as Connection,
        projectId: '0Hn000000000001',
        pipelineId: '0XB000000000001',
      });

      expect(result.success).to.be.false;
      expect(result.error).to.contain('DUPLICATE_VALUE');
    });

    it('propagates connection errors', async () => {
      createStub.rejects(new Error('Connection refused'));

      try {
        await attachProject({
          connection: connectionStub as unknown as Connection,
          projectId: '0Hn000000000001',
          pipelineId: '0XB000000000001',
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('Connection refused');
      }
    });
  });
});
