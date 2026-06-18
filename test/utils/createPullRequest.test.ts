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

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    queryStub = connectionStub.query as unknown as sinon.SinonStub;
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
                RepositoryOwner: 'myorg',
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
      expect(result.repoOwner).to.equal('myorg');
      expect(result.repoName).to.equal('myrepo');
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

    it('fetches VCS owner from Connect API when RepositoryOwner is null', async () => {
      queryStub.onFirstCall().resolves({
        records: [
          {
            Id: '0Wx000000000001',
            Name: 'WI-000001',
            Subject: 'Fix',
            DevopsProjectId: '1Qg000000000001',
            DevopsPipelineStageId: null,
            SourceCodeRepositoryBranch: {
              Name: 'feature/WI-000001',
              SourceCodeRepository: {
                Name: 'myrepo',
                RepositoryOwner: null,
                Provider: 'GitHub',
              },
            },
          },
        ],
      });
      queryStub.onSecondCall().resolves({ records: [] });
      (connectionStub.request as unknown as sinon.SinonStub).resolves({ owner: 'api-owner' });
      (connectionStub.getApiVersion as unknown as sinon.SinonStub).returns('65.0');

      const result = await fetchWorkItemDetail(connectionStub as unknown as Connection, { name: 'WI-000001' });

      expect(result.repoOwner).to.equal('api-owner');
    });
  });

  describe('createPullRequest', () => {
    let fetchStub: sinon.SinonStub;

    beforeEach(() => {
      fetchStub = sinon.stub(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('creates a GitHub PR and returns result', async () => {
      const htmlUrl = 'https://github.com/myorg/myrepo/pull/42';
      fetchStub.resolves({
        ok: true,
        // eslint-disable-next-line camelcase
        json: async () => ({ title: 'Fix login bug', html_url: htmlUrl }),
      });

      const result = await createPullRequest({
        owner: 'myorg',
        repo: 'myrepo',
        head: 'feature/WI-000001',
        base: 'integration',
        title: 'Fix login bug',
        body: 'Description',
        provider: 'github',
        token: 'ghp_test123',
      });

      expect(result.success).to.be.true;
      expect(result.title).to.equal('Fix login bug');
      expect(result.url).to.equal(htmlUrl);
      expect(result.sourceBranch).to.equal('feature/WI-000001');
      expect(result.targetBranch).to.equal('integration');

      const callArgs = fetchStub.firstCall.args;
      expect(callArgs[0]).to.equal('https://api.github.com/repos/myorg/myrepo/pulls');
    });

    it('throws on GitHub API error with message', async () => {
      fetchStub.resolves({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'Validation Failed',
          errors: [{ message: 'A pull request already exists' }],
        }),
      });

      try {
        await createPullRequest({
          owner: 'myorg',
          repo: 'myrepo',
          head: 'feature/WI-000001',
          base: 'integration',
          title: 'Fix',
          provider: 'github',
          token: 'ghp_test',
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('Validation Failed');
        expect((e as Error).message).to.contain('already exists');
      }
    });

    it('creates a Bitbucket PR and returns result', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          title: 'Fix login bug',
          links: { html: { href: 'https://bitbucket.org/myorg/myrepo/pull-requests/7' } },
        }),
      });

      const result = await createPullRequest({
        owner: 'myorg',
        repo: 'myrepo',
        head: 'feature/WI-000001',
        base: 'integration',
        title: 'Fix login bug',
        provider: 'bitbucket',
        token: 'bb_test123',
      });

      expect(result.success).to.be.true;
      expect(result.url).to.equal('https://bitbucket.org/myorg/myrepo/pull-requests/7');

      const callArgs = fetchStub.firstCall.args;
      expect(callArgs[0]).to.equal('https://api.bitbucket.org/2.0/repositories/myorg/myrepo/pullrequests');
    });

    it('throws on unsupported provider', async () => {
      try {
        await createPullRequest({
          owner: 'o',
          repo: 'r',
          head: 'h',
          base: 'b',
          title: 't',
          provider: 'gitlab',
          token: 'tok',
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('Unsupported VCS provider');
      }
    });
  });
});
