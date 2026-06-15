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
import * as sinon from 'sinon';
import { Connection } from '@salesforce/core';
import esmock from 'esmock';

const MOCK_RECORD = {
  Id: 'WI001',
  Name: 'WI-001',
  Subject: 'Fix bug',
  Description: 'Details',
  Status: 'In Progress',
  AssignedToId: 'USER001',
  DevopsPipelineStageId: 'S1',
  DevopsProjectId: 'PROJ001',
  SourceCodeRepositoryBranch: {
    Name: 'feature/branch',
    SourceCodeRepository: {
      Name: 'my-repo',
      Provider: 'github',
      RepositoryOwner: 'myorg',
    },
  },
};

describe('fetchWorkItems', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns empty array when query has no records', async () => {
    (connectionStub.query as sinon.SinonStub).resolves({ records: null });

    const { fetchWorkItems } = await esmock('../../src/utils/workItems.js', {
      '../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: sinon.stub().resolves(undefined),
        fetchPipelineStages: sinon.stub().resolves([]),
      },
    });

    const result = await fetchWorkItems(connectionStub as unknown as Connection, 'PROJ001');
    expect(result).to.deep.equal([]);
  });

  it('returns mapped work items', async () => {
    (connectionStub.query as sinon.SinonStub).resolves({ records: [MOCK_RECORD] });
    (connectionStub.request as sinon.SinonStub).rejects(new Error('no vcs'));

    const { fetchWorkItems } = await esmock('../../src/utils/workItems.js', {
      '../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: sinon.stub().resolves(undefined),
        fetchPipelineStages: sinon.stub().resolves([]),
      },
    });

    const result = await fetchWorkItems(connectionStub as unknown as Connection, 'PROJ001');

    expect(result).to.have.length(1);
    expect(result[0].id).to.equal('WI001');
    expect(result[0].name).to.equal('WI-001');
    expect(result[0].subject).to.equal('Fix bug');
    expect(result[0].status).to.equal('In Progress');
    expect(result[0].DevopsProjectId).to.equal('PROJ001');
    expect(result[0].WorkItemBranch).to.equal('feature/branch');
  });

  it('maps work item with github repo url when vcs owner found', async () => {
    (connectionStub.query as sinon.SinonStub).resolves({ records: [MOCK_RECORD] });
    (connectionStub.request as sinon.SinonStub).resolves({ owner: 'myorg' });

    const { fetchWorkItems } = await esmock('../../src/utils/workItems.js', {
      '../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: sinon.stub().resolves(undefined),
        fetchPipelineStages: sinon.stub().resolves([]),
      },
    });

    const result = await fetchWorkItems(connectionStub as unknown as Connection, 'PROJ001');

    expect(result[0].SourceCodeRepository?.repoUrl).to.include('github.com');
    expect(result[0].SourceCodeRepository?.repoType).to.equal('github');
  });

  it('maps work item with bitbucket repo url', async () => {
    const bbRecord = {
      ...MOCK_RECORD,
      SourceCodeRepositoryBranch: {
        ...MOCK_RECORD.SourceCodeRepositoryBranch,
        SourceCodeRepository: {
          Name: 'my-repo',
          Provider: 'bitbucket',
          RepositoryOwner: 'myworkspace',
        },
      },
    };
    (connectionStub.query as sinon.SinonStub).resolves({ records: [bbRecord] });
    (connectionStub.request as sinon.SinonStub).rejects(new Error('no vcs'));

    const { fetchWorkItems } = await esmock('../../src/utils/workItems.js', {
      '../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: sinon.stub().resolves(undefined),
        fetchPipelineStages: sinon.stub().resolves([]),
      },
    });

    const result = await fetchWorkItems(connectionStub as unknown as Connection, 'PROJ001');

    expect(result[0].SourceCodeRepository?.repoUrl).to.include('bitbucket.org');
    expect(result[0].SourceCodeRepository?.repoType).to.equal('bitbucket');
  });

  it('handles record with no SourceCodeRepositoryBranch', async () => {
    const bare = {
      Id: 'WI002',
      Name: 'WI-002',
      Subject: null,
      Description: null,
      Status: 'Open',
      AssignedToId: null,
      DevopsPipelineStageId: null,
      DevopsProjectId: 'PROJ001',
      SourceCodeRepositoryBranch: null,
    };
    (connectionStub.query as sinon.SinonStub).resolves({ records: [bare] });

    const { fetchWorkItems } = await esmock('../../src/utils/workItems.js', {
      '../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: sinon.stub().resolves(undefined),
        fetchPipelineStages: sinon.stub().resolves([]),
      },
    });

    const result = await fetchWorkItems(connectionStub as unknown as Connection, 'PROJ001');

    expect(result[0].SourceCodeRepository).to.be.undefined;
    expect(result[0].WorkItemBranch).to.be.undefined;
  });

  it('resolves target stage when pipeline stages exist', async () => {
    (connectionStub.query as sinon.SinonStub).resolves({ records: [MOCK_RECORD] });
    (connectionStub.request as sinon.SinonStub).rejects(new Error('no vcs'));

    const { fetchWorkItems } = await esmock('../../src/utils/workItems.js', {
      '../../src/utils/pipelineUtils.js': {
        getPipelineIdForProject: sinon.stub().resolves('PIPE001'),
        fetchPipelineStages: sinon.stub().resolves([
          { Id: 'S1', NextStageId: 'S2', SourceCodeRepositoryBranch: { Name: 'branch-1' } },
          { Id: 'S2', NextStageId: null, SourceCodeRepositoryBranch: { Name: 'branch-2' } },
        ]),
      },
    });

    const result = await fetchWorkItems(connectionStub as unknown as Connection, 'PROJ001');

    expect(result[0].TargetStageId).to.equal('S2');
    expect(result[0].TargetBranch).to.equal('branch-2');
  });
});
