/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */
import { expect } from '@oclif/test';
import * as sinon from 'sinon';
import { Org, SfError } from '@salesforce/core';
import { fetchAndValidatePipelineStage } from '../../src/common/utils';
import { PipelineStage } from '../../src/common';
import * as PipelineSelector from '../../src/common/selectors/pipelineStageSelector';

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
  Name: 'uat',
  sf_devops__Environment__r: {
    Id: 'Dummy env',
    sf_devops__Named_Credential__c: 'abc',
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
  Name: 'uat',
  sf_devops__Environment__r: {
    Id: 'Dummy env',
    sf_devops__Named_Credential__c: 'abc',
  },
};

describe('fetchAndValidatePipelineStage', () => {
  let sandbox: sinon.SinonSandbox;
  const stubOrg = sinon.createStubInstance(Org);
  let mockRecords: PipelineStage[] = [mockRecord1, mockRecord2];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns the correct piepeline stage record', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').resolves(mockRecords);
    const pipelineStage: PipelineStage = await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
    expect(pipelineStage.sf_devops__Branch__r.sf_devops__Name__c).to.equal(BRANCH_NAME_1);
    expect(pipelineStage.sf_devops__Pipeline__r.sf_devops__Project__c).to.equal(PROJECT_NAME);
  });

  it('fails when we do not find a branch with the given name', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').resolves(mockRecords);
    const invalidBranchName = 'invalid branch name';
    try {
      await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, invalidBranchName);
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.contain(
        `The ${invalidBranchName} branch doesn't exist in ${PROJECT_NAME} project. Specify a valid branch name and try again.`
      );
    }
  });

  it('fails when we do not find a project with the given name', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(PipelineSelector, 'selectPipelineStagesByProject').resolves(mockRecords);
    mockRecords = [];

    try {
      await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
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
    mockRecords = [];

    try {
      await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
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
    mockRecords = [];

    try {
      await fetchAndValidatePipelineStage(stubOrg, PROJECT_NAME, BRANCH_NAME_1);
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.contain('NOT_FOUND');
    }
  });
});
