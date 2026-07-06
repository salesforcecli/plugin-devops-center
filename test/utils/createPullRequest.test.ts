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
import { fetchWorkItemDetail, createPullRequest } from '../../src/utils/createPullRequest.js';

describe('createPullRequest utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;
  let queryStub: sinon.SinonStub;
  let requestStub: sinon.SinonStub;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    // eslint-disable-next-line @typescript-eslint/unbound-method
    queryStub = connectionStub.query as unknown as sinon.SinonStub;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    requestStub = connectionStub.request as unknown as sinon.SinonStub;
    (connectionStub.getApiVersion as unknown as sinon.SinonStub).returns('65.0');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('fetchWorkItemDetail', () => {
    it('returns full work item detail by name', async () => {
      queryStub.onFirstCall().resolves({
        records: [
          {
            Id: '0Wx000000000001',
            Name: 'WI-000001',
            Subject: 'Fix login bug',
            DevopsProjectId: '1Qg000000000001',
            DevopsPipelineStageId: null,
            SourceCodeRepositoryBranch: {
              Name: 'feature/WI-000001',
              SourceCodeRepository: {
                Name: 'myrepo',
                Provider: 'GitHub',
              },
            },
          },
        ],
      });
      queryStub.onSecondCall().resolves({
        records: [{ DevopsPipelineId: 'PIPE001' }],
      });
      queryStub.onThirdCall().resolves({
        records: [
          {
            Id: 'STAGE1',
            Name: 'Integration',
            NextStageId: 'STAGE2',
            SourceCodeRepositoryBranch: { Name: 'integration' },
          },
          { Id: 'STAGE2', Name: 'Production', NextStageId: null, SourceCodeRepositoryBranch: { Name: 'main' } },
        ],
      });

      const result = await fetchWorkItemDetail(connectionStub as unknown as Connection, { name: 'WI-000001' });

      expect(result.workItemId).to.equal('0Wx000000000001');
      expect(result.workItemName).to.equal('WI-000001');
      expect(result.branchName).to.equal('feature/WI-000001');
      expect(result.provider).to.equal('github');
      expect(result.targetBranch).to.equal('integration');
    });

    it('returns undefined branchName when no branch', async () => {
      queryStub.onFirstCall().resolves({
        records: [
          {
            Id: '0Wx000000000001',
            Name: 'WI-000001',
            Subject: 'Fix login bug',
            DevopsProjectId: '1Qg000000000001',
            DevopsPipelineStageId: null,
            SourceCodeRepositoryBranch: null,
          },
        ],
      });
      queryStub.onSecondCall().resolves({ records: [] });

      const result = await fetchWorkItemDetail(connectionStub as unknown as Connection, { name: 'WI-000001' });

      expect(result.branchName).to.be.undefined;
    });

    it('throws when work item not found by name', async () => {
      queryStub.resolves({ records: [] });

      try {
        await fetchWorkItemDetail(connectionStub as unknown as Connection, { name: 'WI-999999' });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('WI-999999');
        expect((e as Error).message).to.contain('not found');
      }
    });

    it('throws when work item not found by id', async () => {
      queryStub.resolves({ records: [] });

      try {
        await fetchWorkItemDetail(connectionStub as unknown as Connection, { id: '0Wx999999999999' });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('0Wx999999999999');
        expect((e as Error).message).to.contain('not found');
      }
    });
  });

  describe('createPullRequest', () => {
    it('returns success with reviewUrl when API responds with reviewUrl', async () => {
      requestStub.resolves({ reviewUrl: 'https://bitbucket.org/myorg/myrepo/pull-requests/7' });

      const result = await createPullRequest(connectionStub as unknown as Connection, '0Wx000000000001');

      expect(result.success).to.be.true;
      expect(result.url).to.equal('https://bitbucket.org/myorg/myrepo/pull-requests/7');
      const call = requestStub.firstCall.args[0] as { method: string; url: string };
      expect(call.method).to.equal('POST');
      expect(call.url).to.include('/connect/devops/workItems/0Wx000000000001/review');
    });

    it('returns success with undefined url when reviewUrl is absent', async () => {
      requestStub.resolves({ status: 'Success' });

      const result = await createPullRequest(connectionStub as unknown as Connection, '0Wx000000000001');

      expect(result.success).to.be.true;
      expect(result.url).to.be.undefined;
    });

    it('throws a friendly message when API returns no-changes error', async () => {
      requestStub.rejects(
        new Error(
          'REVIEW_CREATION_FAILED:Failed to create pull request: Unexpected response from named credential callout: {"type":"error","error":{"message":"There are no changes to be pulled"}}'
        )
      );

      try {
        await createPullRequest(connectionStub as unknown as Connection, '0Wx000000000001');
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('Push your changes and try again');
      }
    });

    it('strips REVIEW_CREATION_FAILED prefix and returns inner message', async () => {
      requestStub.rejects(
        new Error(
          'REVIEW_CREATION_FAILED:Failed to create pull request: {"type":"error","error":{"message":"Repository not found"}}'
        )
      );

      try {
        await createPullRequest(connectionStub as unknown as Connection, '0Wx000000000001');
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.equal('Repository not found');
      }
    });

    it('throws when response body indicates error', async () => {
      requestStub.resolves({ status: 'Error', errorMessage: 'PR already exists' });

      try {
        await createPullRequest(connectionStub as unknown as Connection, '0Wx000000000001');
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('PR already exists');
      }
    });
  });
});
