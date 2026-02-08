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

import { QueryResult } from 'jsforce';
import { Connection } from '@salesforce/core';
import { WorkItem } from '../types';
import { runSafeQuery } from './selectorUtils';

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

  const resp: QueryResult<WorkItemsQueryResult> = await runSafeQuery(con, queryStr);
  return resp.records;
}
