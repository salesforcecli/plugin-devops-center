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
  selectWorkItemsByChangeBundles,
  WorkItemsQueryResult,
} from '../../../src/common/selectors/changeBundleSelector';
import { WorkItem } from '../../../src/common/types';

const MOCK_WORK_ITEM_1: WorkItem = {
  Name: 'WI1',
};

const MOCK_WORK_ITEM_2: WorkItem = {
  Name: 'WI2',
};

const MOCK_WORK_ITEM_3: WorkItem = {
  Name: 'WI3',
};

const MOCK_WORK_ITEM_4: WorkItem = {
  Name: 'WI4',
};

const MOCK_WORK_ITEMS_1: WorkItem[] = [MOCK_WORK_ITEM_1, MOCK_WORK_ITEM_2];
const MOCK_WORK_ITEMS_2: WorkItem[] = [MOCK_WORK_ITEM_3, MOCK_WORK_ITEM_4];

describe('WI selector', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('uses the connection to fetch the records', async () => {
    const mockRecord: QueryResult<WorkItemsQueryResult> = {
      done: true,
      records: [
        {
          Id: 'AAA',
          sf_devops__Work_Items__r: {
            done: true,
            records: MOCK_WORK_ITEMS_1,
            totalSize: MOCK_WORK_ITEMS_1.length,
          },
        },
        {
          Id: 'BBB',
          sf_devops__Work_Items__r: {
            done: true,
            records: MOCK_WORK_ITEMS_2,
            totalSize: MOCK_WORK_ITEMS_2.length,
          },
        },
      ],
      totalSize: 2,
    };
    const mockConnection = sandbox.createStubInstance(Connection);
    mockConnection.query.resolves(mockRecord);

    const result = await selectWorkItemsByChangeBundles(mockConnection, ['AAA', 'BBB']);

    // Verify we received the correct result
    expect(mockConnection.query.called).to.equal(true);
    expect(result).to.equal(mockRecord.records);

    // Verify we queried the correct object
    const builderArgs = mockConnection.query.getCall(0).args;
    expect(builderArgs[0]).to.contain('FROM sf_devops__Change_Bundle__c');

    // Verify we queried the correct references
    expect(builderArgs[0]).to.contain('SELECT Name FROM sf_devops__Work_Items__r');

    // Verify we used the correct filter
    expect(builderArgs[0]).to.contain("WHERE Id IN ('AAA', 'BBB')");
  });
});
