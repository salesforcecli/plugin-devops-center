/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { AsyncOperationResult } from '../types';

/**
 *
 * Returns an Async Operation Result record filtering by project name.
 */
export async function selectAsyncOperationResultById(con: Connection, aorId: string): Promise<AsyncOperationResult> {
  const queryStr = `SELECT sf_devops__Status__c, sf_devops__Message__c, sf_devops__Error_Details__c
                    FROM sf_devops__Async_Operation_Result__c  
                    WHERE Id = '${aorId}'`;
  return con.singleRecordQuery(queryStr);
}
