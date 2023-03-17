/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */

import { expect } from '@oclif/test';
import { Connection } from '@salesforce/core';
import { QueryResult } from 'jsforce';
import sinon = require('sinon');
import { EnvQueryResult, selectPipelineStageByEnvironment } from '../../../src/common/selectors/environmentSelector';
import { PipelineStage } from '../../../src/common/types';
import * as SelectorUtils from '../../../src/common/selectors/selectorUtils';

const MOCK_PIPELINE_STAGE: PipelineStage = {
  Id: 'mock-Id',
  sf_devops__Branch__r: {
    sf_devops__Name__c: 'mock-branch',
  },
  sf_devops__Pipeline__r: {
    sf_devops__Project__c: 'mock-project-name',
  },
  Name: 'staging',
  sf_devops__Environment__r: {
    Id: 'AAA',
    sf_devops__Named_Credential__c: 'ABC',
  },
};

describe('environment selector', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('uses the connection to fetch the records', async () => {
    const mockRecord: QueryResult<EnvQueryResult> = {
      done: true,
      records: [
        {
          sf_devops__Named_Credential__c: 'ABC',
          sf_devops__Pipeline_Stages__r: {
            done: true,
            records: [MOCK_PIPELINE_STAGE],
            totalSize: 1,
          },
        },
      ],
      totalSize: 1,
    };
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves(mockRecord);

    const runSafeQuerySpy = sandbox.spy(SelectorUtils, 'runSafeQuery');

    const result = await selectPipelineStageByEnvironment(mockConnection, 'AAA');

    expect(runSafeQuerySpy.called).to.equal(true);

    // Verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result).to.equal(mockRecord.records[0]);

    // Verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Environment__c');

    // Verify we queried the correct references
    expect(builderArgs[0]).to.contain('SELECT Name FROM sf_devops__Pipeline_Stages__r');

    // Verify we queried the correct fields
    expect(builderArgs[0]).to.contain('sf_devops__Named_Credential__c');

    // Verify we used the correct filter
    expect(builderArgs[0]).to.contain("WHERE Id = 'AAA'");
  });
});
