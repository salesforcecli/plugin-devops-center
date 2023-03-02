/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable camelcase */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Connection } from '@salesforce/core';
import { QueryResult } from 'jsforce';
import * as selector from '../../../src/common/selectors/pipelineStageSelector';
import { PipelineStage } from '../../../src/common';

const MOCK_PIPELINE_STAGE: PipelineStage = {
  Id: 'mock-Id',
  sf_devops__Branch__r: {
    sf_devops__Name__c: 'mock-branch',
  },
  sf_devops__Pipeline__r: {
    sf_devops__Project__c: 'mock-project-name',
  },
  Name: 'stage',
  sf_devops__Environment__r: {
    Id: 'ABC',
    sf_devops__Named_Credential__c: 'AAA',
  },
};

describe('AOR selector', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('uses the connection to fetch the records', async () => {
    const mockRecord: QueryResult<PipelineStage> = { done: true, records: [MOCK_PIPELINE_STAGE], totalSize: 1 };
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves(mockRecord);

    const result = await selector.selectPipelineStagesByProject(mockConnection, 'mock-project-name');

    // verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result).to.equal(mockRecord.records);

    // verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Pipeline_Stage__c');
    // verify we queried the correct fields
    expect(builderArgs[0]).to.contain('Id');
    expect(builderArgs[0]).to.contain('sf_devops__Pipeline__r.sf_devops__Project__c');
    expect(builderArgs[0]).to.contain('sf_devops__Branch__r.sf_devops__Name__c');
    expect(builderArgs[0]).to.contain('(SELECT Id FROM sf_devops__Pipeline_Stages__r)');
    // verify we used the correct filter
    expect(builderArgs[0]).to.contain("WHERE sf_devops__Pipeline__r.sf_devops__Project__r.Name = 'mock-project-name'");
  });
});
