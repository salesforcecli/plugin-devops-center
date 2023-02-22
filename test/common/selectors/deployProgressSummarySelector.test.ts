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
import {
  DeploySummaryQueryResult,
  selectDeployAORSummaryData,
} from '../../../src/common/selectors/deployProgressSummarySelector';
import { WorkItemPromote } from '../../../src/common/types';

const WORK_ITEM_1: WorkItemPromote = {
  sf_devops__Pipeline_Stage__r: {
    Id: 'AAA',
    Name: 'integration',
    sf_devops__Branch__r: {
      sf_devops__Name__c: 'int',
    },
    sf_devops__Pipeline__r: {
      sf_devops__Project__c: 'project',
    },
    sf_devops__Pipeline_Stages__r: undefined,
    sf_devops__Environment__r: {
      Id: 'ABC',
      sf_devops__Named_Credential__c: 'DEF',
    },
  },
  sf_devops__Work_Item__r: {
    Name: 'WI1',
  },
};

const WORK_ITEM_2: WorkItemPromote = {
  sf_devops__Pipeline_Stage__r: {
    Id: 'BBB',
    Name: 'integration',
    sf_devops__Branch__r: {
      sf_devops__Name__c: 'int',
    },
    sf_devops__Pipeline__r: {
      sf_devops__Project__c: 'project',
    },
    sf_devops__Pipeline_Stages__r: undefined,
    sf_devops__Environment__r: {
      Id: 'ABC',
      sf_devops__Named_Credential__c: 'DEF',
    },
  },
  sf_devops__Work_Item__r: {
    Name: 'WI2',
  },
};

const WORK_ITEMS: WorkItemPromote[] = [WORK_ITEM_1, WORK_ITEM_2];

describe('deploy progress sumary selector', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('uses the connection to fetch the records', async () => {
    const mockRecord: QueryResult<DeploySummaryQueryResult> = {
      done: true,
      records: [
        {
          sf_devops__Work_Item_Promotes__r: {
            done: true,
            records: WORK_ITEMS,
            totalSize: WORK_ITEMS.length,
          },
          sf_devops__Change_Bundle_Installs__r: null,
          sf_devops__Operation__c: null,
          sf_devops__Work_Items__r: null,
        },
      ],
      totalSize: 1,
    };
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves(mockRecord);

    const result = await selectDeployAORSummaryData(mockConnection, 'AAA');

    // Verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result).to.equal(mockRecord.records[0]);

    // Verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Async_Operation_Result__c');

    // Verify we queried the correct references
    expect(builderArgs[0]).to.contain(
      'SELECT sf_devops__Pipeline_Stage__r.Name, sf_devops__Pipeline_Stage__r.sf_devops__Environment__r.sf_devops__Named_Credential__c, sf_devops__Work_Item__r.Name FROM sf_devops__Work_Item_Promotes__r'
    );
    expect(builderArgs[0]).to.contain(
      'SELECT sf_devops__Change_Bundle__r.Id, sf_devops__Change_Bundle__r.sf_devops__Version_Name__c, sf_devops__Environment__r.Id FROM sf_devops__Change_Bundle_Installs__r'
    );

    // Verify we used the correct filter
    expect(builderArgs[0]).to.contain("WHERE Id = 'AAA'");
  });
});
