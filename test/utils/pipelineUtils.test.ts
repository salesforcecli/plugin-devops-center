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
import {
  getPipelineIdForProject,
  fetchPipelineStages,
  computeFirstStageId,
  resolveTargetStageId,
  findStageById,
  getBranchNameFromStage,
} from '../../src/utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../src/utils/types.js';

const STAGES: PipelineStageRecord[] = [
  { Id: 'S1', Name: 'Stage 1', NextStageId: 'S2', SourceCodeRepositoryBranch: { Name: 'branch-1' } },
  { Id: 'S2', Name: 'Stage 2', NextStageId: null, SourceCodeRepositoryBranch: { Name: 'branch-2' } },
];

describe('pipelineUtils', () => {
  let connectionStub: sinon.SinonStubbedInstance<Connection>;

  beforeEach(() => {
    connectionStub = sinon.createStubInstance(Connection);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getPipelineIdForProject', () => {
    it('returns pipeline id when found', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({
        records: [{ DevopsPipelineId: 'PIPE001' }],
      });

      const result = await getPipelineIdForProject(connectionStub as unknown as Connection, 'PROJ001');
      expect(result).to.equal('PIPE001');
    });

    it('returns undefined when no records', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: [] });

      const result = await getPipelineIdForProject(connectionStub as unknown as Connection, 'PROJ001');
      expect(result).to.be.undefined;
    });

    it('returns undefined when records is null', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: null });

      const result = await getPipelineIdForProject(connectionStub as unknown as Connection, 'PROJ001');
      expect(result).to.be.undefined;
    });
  });

  describe('fetchPipelineStages', () => {
    it('returns stages when found', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: STAGES });

      const result = await fetchPipelineStages(connectionStub as unknown as Connection, 'PIPE001');
      expect(result).to.deep.equal(STAGES);
    });

    it('returns empty array when no records', async () => {
      (connectionStub.query as sinon.SinonStub).resolves({ records: null });

      const result = await fetchPipelineStages(connectionStub as unknown as Connection, 'PIPE001');
      expect(result).to.deep.equal([]);
    });
  });

  describe('computeFirstStageId', () => {
    it('returns the stage that no other stage points to as next', () => {
      const result = computeFirstStageId(STAGES);
      expect(result).to.equal('S1');
    });

    it('returns undefined when multiple candidates exist', () => {
      const stages: PipelineStageRecord[] = [
        { Id: 'A', NextStageId: null },
        { Id: 'B', NextStageId: null },
      ];
      expect(computeFirstStageId(stages)).to.be.undefined;
    });

    it('returns undefined when no stages', () => {
      expect(computeFirstStageId([])).to.be.undefined;
    });
  });

  describe('resolveTargetStageId', () => {
    it('returns NextStageId of the current stage', () => {
      expect(resolveTargetStageId('S1', STAGES)).to.equal('S2');
    });

    it('returns undefined when current stage has no next', () => {
      expect(resolveTargetStageId('S2', STAGES)).to.be.undefined;
    });

    it('returns undefined when currentStageId is undefined', () => {
      expect(resolveTargetStageId(undefined, STAGES)).to.be.undefined;
    });

    it('returns undefined when stages is empty', () => {
      expect(resolveTargetStageId('S1', [])).to.be.undefined;
    });
  });

  describe('findStageById', () => {
    it('returns the matching stage', () => {
      expect(findStageById(STAGES, 'S2')).to.deep.equal(STAGES[1]);
    });

    it('returns undefined when not found', () => {
      expect(findStageById(STAGES, 'S99')).to.be.undefined;
    });

    it('returns undefined when stageId is undefined', () => {
      expect(findStageById(STAGES, undefined)).to.be.undefined;
    });
  });

  describe('getBranchNameFromStage', () => {
    it('returns branch name from stage', () => {
      expect(getBranchNameFromStage(STAGES[0])).to.equal('branch-1');
    });

    it('returns undefined when stage is undefined', () => {
      expect(getBranchNameFromStage(undefined)).to.be.undefined;
    });

    it('returns undefined when branch is null', () => {
      const stage: PipelineStageRecord = { Id: 'S1', SourceCodeRepositoryBranch: null };
      expect(getBranchNameFromStage(stage)).to.be.undefined;
    });
  });
});
