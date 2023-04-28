/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { QueryResult } from 'jsforce';
import { Connection } from '@salesforce/core';
import { ChangeBundleInstall } from '../types';
import { runSafeQuery } from './selectorUtils';

/**
 * Returns the data necessary to create the deploy summary (or part of it).
 */
export async function selectValidateDeployAORSummaryDataById(
  con: Connection,
  aorId: string
): Promise<ChangeBundleInstall[]> {
  const queryStr = `SELECT sf_devops__Change_Bundle__r.Id, sf_devops__Change_Bundle__r.sf_devops__Version_Name__c, sf_devops__Environment__r.Id
                    FROM sf_devops__Change_Bundle_Install__c 
                    WHERE sf_devops__Deployment_Result__r.sf_devops__Check_Deploy_Status__c = '${aorId}'`;

  const resp: QueryResult<ChangeBundleInstall> = await runSafeQuery(con, queryStr);
  return resp.records;
}
