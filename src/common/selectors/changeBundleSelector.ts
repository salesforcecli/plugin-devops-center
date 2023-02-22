/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { QueryResult } from 'jsforce';
import { Connection } from '@salesforce/core';
import { WorkItem } from '../types';

// This type will be defined here as it is specific for this function
export type WorkItemsQueryResult = {
  Id: string;
  sf_devops__Work_Items__r: QueryResult<WorkItem>;
};

/**
 * Returns the work items included in the change bundles sent
 */
export async function selectWorkItemsByChangeBundles(
  con: Connection,
  changeBundles: string[]
): Promise<WorkItemsQueryResult[]> {
  const queryStr = `SELECT Id,
                    (SELECT Name FROM sf_devops__Work_Items__r)
                    FROM sf_devops__Change_Bundle__c
                    WHERE Id IN (${changeBundles.map((id) => "'" + id + "'").join(', ')})`;
  // TODO Handle error
  const resp: QueryResult<WorkItemsQueryResult> = await con.query(queryStr);
  return resp.records;
}
