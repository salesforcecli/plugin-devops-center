/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { Connection, Org, SfError } from '@salesforce/core';
import { containsSfId, fetchAndValidatePipelineStage, matchesSfId } from '../../src/common/utils';
import { fetchAsyncOperationResult } from '../../src/common/utils';
import { AsyncOperationResult, AsyncOperationStatus, PipelineStage } from '../../src/common';
import * as PipelineSelector from '../../src/common/selectors/pipelineStageSelector';
import * as AorSelector from '../../src/common/selectors/asyncOperationResultsSelector';

const PROJECT_NAME = 'Dummy Project Name';
const BRANCH_NAME_1 = 'Dummy Branch Name 1';
const BRANCH_NAME_2 = 'Dummy Branch Name 2';

const mockRecord1: PipelineStage = {
  Id: '1',
  sf_devops__Branch__r: {
    sf_devops__Name__c: BRANCH_NAME_1,
  },
  sf_devops__Pipeline__r: {
    sf_devops__Project__c: PROJECT_NAME,
  },
};
const mockRecord2: PipelineStage = {
  Id: '2',
  sf_devops__Branch__r: {
    sf_devops__Name__c: BRANCH_NAME_2,
  },
  sf_devops__Pipeline__r: {
    sf_devops__Project__c: PROJECT_NAME,
  },
};

describe('utils', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('fetchAndValidatePipelineStage', () => {
    const stubOrg = sinon.createStubInstance(Org);
    let mockPipelineStageRecords: PipelineStage[] = [mockRecord1, mockRecord2];
    it('returns the correct piepeline stage record', async () => {
      sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').resolves(mockPipelineStageRecords);
      const pipelineStage: PipelineStage = await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
      expect(pipelineStage.sf_devops__Branch__r.sf_devops__Name__c).to.equal(BRANCH_NAME_1);
      expect(pipelineStage.sf_devops__Pipeline__r.sf_devops__Project__c).to.equal(PROJECT_NAME);
    });

    it('fails when we do not find a branch with the given name', async () => {
      sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').resolves(mockPipelineStageRecords);
      const invalidBranchName = 'invalid branch name';
      try {
        await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, invalidBranchName);
        assert(false);
      } catch (err) {
        const error = err as SfError;
        expect(error.message).to.contain(
          `The ${invalidBranchName} branch doesn't exist in ${PROJECT_NAME} project. Specify a valid branch name and try again.`
        );
      }
    });

    it('fails when we do not find a project with the given name', async () => {
      mockPipelineStageRecords = [];
      sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').resolves(mockPipelineStageRecords);

      try {
        await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
        assert(false);
      } catch (err) {
        const error = err as SfError;
        expect(error.message).to.contain(
          `The ${PROJECT_NAME} project doesn't exist. Specify a valid project name and try again.`
        );
      }
    });

    it('fails when Devop Center is not installed in the target org', async () => {
      sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').throws({
        errorCode: 'INVALID_TYPE',
        name: 'INVALID_TYPE',
      });
      mockPipelineStageRecords = [];

      try {
        await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
        assert(false);
      } catch (err) {
        const error = err as SfError;
        expect(error.message).to.contain(
          "The DevOps Center app wasn't found in the specified org. Verify the org username and try again."
        );
      }
    });

    it('fails when Devop Center is not installed in the target org', async () => {
      sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').throws({
        errorMessage: 'NOT_FOUND',
        errorStatusCode: 404,
      });
      mockPipelineStageRecords = [];

      try {
        await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
        assert(false);
      } catch (err) {
        const error = err as SfError;
        expect(error.message).to.contain('NOT_FOUND');
      }
    });
  });

  describe('fetchAsyncOperationResult', () => {
    const stubConnection = sinon.createStubInstance(Connection);
    let mockAorRecord: AsyncOperationResult;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('returns an AOR record', async () => {
      mockAorRecord = {
        Id: 'mock-id',
        sf_devops__Message__c: 'mock-message',
        sf_devops__Status__c: AsyncOperationStatus.Completed,
      };
      sandbox.stub(AorSelector, 'selectAsyncOperationResultById').resolves(mockAorRecord);

      const result = await fetchAsyncOperationResult(stubConnection, 'mock-id');
      expect(result).to.equal(mockAorRecord);
    });

    it('displays an specific message when no record is found', async () => {
      mockAorRecord = {
        Id: 'mock-id',
        sf_devops__Message__c: 'mock-message',
        sf_devops__Status__c: AsyncOperationStatus.Completed,
      };
      sandbox
        .stub(AorSelector, 'selectAsyncOperationResultById')
        .throwsException({ name: 'SingleRecordQuery_NoRecords' });

      try {
        await fetchAsyncOperationResult(stubConnection, 'mock-id');
        assert(false);
      } catch (err) {
        const error = err as SfError;
        expect(error.message).to.contain('No job found for ID: mock-id.');
      }
    });

    it('displays an error message when there is an unexpected error', async () => {
      mockAorRecord = {
        Id: 'mock-id',
        sf_devops__Message__c: 'mock-message',
        sf_devops__Status__c: AsyncOperationStatus.Completed,
      }; // { code: 'ENOENT' }
      sandbox.stub(AorSelector, 'selectAsyncOperationResultById').throws('unexpected error');

      try {
        await fetchAsyncOperationResult(stubConnection, 'mock-id');
        assert(false);
      } catch (err) {
        const error = err as SfError;
        expect(error.name).to.contain('unexpected error');
      }
    });

    it('compares a 15 character Id with the same 15 chars Id', async () => {
      const id1 = '001000000000001';
      const id2 = '001000000000001';
      const matchResult = matchesSfId(id1, id2);
      expect(matchResult).to.be.ok;
    });

    it('compares a 15 character Id with a different 15 chars Id', async () => {
      const id1 = '001000000000001';
      const id2 = '001000000000002';
      const matchResult = matchesSfId(id1, id2);
      expect(matchResult).to.not.be.ok;
    });

    it('compares a 15 character Id with the same Id in  18 chars', async () => {
      const id1 = '001000000000001';
      const id2 = '001000000000001AAA';
      const matchResult = matchesSfId(id1, id2);
      expect(matchResult).to.be.ok;
    });

    it('compares a 15 character Id with a different 18 chars Id', async () => {
      const id1 = '001000000000001';
      const id2 = '001000000000002AAA';
      const matchResult = matchesSfId(id1, id2);
      expect(matchResult).to.not.be.ok;
    });

    it('find a 15 character Id in an array of 18 chars arrays', async () => {
      const ids = ['001000000000001AAA', '001000000000002AAB', '001000000000003AAc'];
      const id2 = '001000000000001';
      const matchResult = containsSfId(ids, id2);
      expect(matchResult).to.be.ok;
    });

    it('find a 18 character Id in an array of 18 chars arrays', async () => {
      const ids = ['001000000000001AAA', '001000000000002AAB', '001000000000003AAc'];
      const id2 = '001000000000001AAA';
      const matchResult = containsSfId(ids, id2);
      expect(matchResult).to.be.ok;
    });
  });
});
