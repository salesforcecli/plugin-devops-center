/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { QueryResult } from 'jsforce';
import { DeployComponent } from '../types';
import { runSafeQuery } from './selectorUtils';

export async function selectDeployComponentsByAsyncOpId(
  con: Connection,
  asyncOpId: string
): Promise<DeployComponent[]> {
  const queryStr = `SELECT sf_devops__Source_Component__c, sf_devops__Operation__c, sf_devops__File_Path__c
                    FROM sf_devops__Deploy_Component__c  
                    WHERE sf_devops__Deployment_Result__r.sf_devops__Status__c = '${asyncOpId}'`;

  const resp: QueryResult<DeployComponent> = await runSafeQuery(con, queryStr);
  return resp.records;
}
