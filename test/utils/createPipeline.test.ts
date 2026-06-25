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
import { createPipeline, detectRepoType } from '../../src/utils/createPipeline.js';

describe('createPipeline utilities', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('detectRepoType', () => {
    it('detects github from URL', () => {
      expect(detectRepoType('https://github.com/myorg/myrepo')).to.equal('github');
    });

    it('detects bitbucket from URL', () => {
      expect(detectRepoType('https://bitbucket.org/myorg/myrepo')).to.equal('bitbucket');
    });

    it('returns undefined for unknown URLs', () => {
      expect(detectRepoType('https://gitlab.com/myorg/myrepo')).to.be.undefined;
    });

    it('returns undefined for plain repo names', () => {
      expect(detectRepoType('my-new-repo')).to.be.undefined;
    });
  });

  describe('createPipeline', () => {
    it('sends correct payload for existing repo and returns result', async () => {
      (connectionStub.request as sinon.SinonStub).resolves({
        id: '0XB000000000001',
        message: 'Pipeline created',
        status: 'Inactive',
      });
      (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

      const result = await createPipeline({
        connection: connectionStub as unknown as Connection,
        name: 'Release Pipeline',
        repo: 'https://github.com/myorg/myrepo',
        repoType: 'github',
      });

      expect(result.success).to.be.true;
      expect(result.pipelineId).to.equal('0XB000000000001');
      expect(result.name).to.equal('Release Pipeline');
      expect(result.status).to.equal('Inactive');
      expect(result.repository?.repoUrl).to.equal('https://github.com/myorg/myrepo');
      expect(result.repository?.repoType).to.equal('github');
      expect(result.repository?.created).to.be.false;

      const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
      const body = JSON.parse(callArgs.body as string) as Record<string, unknown>;
      expect(body.name).to.equal('Release Pipeline');
      expect(body.vcsType).to.equal('github');
      expect(body.vcsRepoUrl).to.equal('https://github.com/myorg/myrepo');
      expect(body.stages).to.deep.equal([
        { name: 'Integration' },
        { name: 'UAT' },
        { name: 'Staging' },
        { name: 'Production' },
      ]);
      expect(body).to.not.have.property('createVcsRepo');
      expect(body).to.not.have.property('vcsRepoName');
    });

    it('sends correct payload for creating a new repo', async () => {
      (connectionStub.request as sinon.SinonStub).resolves({
        id: '0XB000000000002',
        message: 'Pipeline and repo created',
        status: 'Inactive',
      });
      (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

      const result = await createPipeline({
        connection: connectionStub as unknown as Connection,
        name: 'New Pipeline',
        repo: 'my-new-repo',
        repoType: 'github',
        createRepo: true,
        repoOwner: 'myorg',
      });

      expect(result.success).to.be.true;
      expect(result.repository?.created).to.be.true;

      const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
      const body = JSON.parse(callArgs.body as string) as Record<string, unknown>;
      expect(body.createVcsRepo).to.be.true;
      expect(body.vcsRepoName).to.equal('my-new-repo');
      expect(body.vcsRepoOwner).to.equal('myorg');
      expect(body).to.not.have.property('vcsRepoUrl');
    });

    it('includes description when provided', async () => {
      (connectionStub.request as sinon.SinonStub).resolves({
        id: '0XB000000000003',
        message: 'Created',
        status: 'Inactive',
      });
      (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

      const result = await createPipeline({
        connection: connectionStub as unknown as Connection,
        name: 'Described Pipeline',
        description: 'My description',
        repo: 'https://github.com/myorg/myrepo',
        repoType: 'github',
      });

      expect(result.success).to.be.true;
      expect(result.description).to.equal('My description');

      const callArgs = (connectionStub.request as sinon.SinonStub).firstCall.args[0];
      const body = JSON.parse(callArgs.body as string) as Record<string, unknown>;
      expect(body.description).to.equal('My description');
    });

    it('propagates API errors', async () => {
      (connectionStub.request as sinon.SinonStub).rejects(new Error('Bad Request'));
      (connectionStub.getApiVersion as sinon.SinonStub).returns('65.0');

      try {
        await createPipeline({
          connection: connectionStub as unknown as Connection,
          name: 'Fail',
          repo: 'https://github.com/myorg/myrepo',
          repoType: 'github',
        });
        expect.fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).to.contain('Bad Request');
      }
    });
  });
});
