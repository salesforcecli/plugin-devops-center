/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { QueryResult } from 'jsforce';
import { DeploymentResult } from '../types';
import { runSafeQuery } from './selectorUtils';

/**
 *
 * Returns deployment result record filtering by async job id.
 */
export async function selectOneDeploymentResultByAsyncJobId(
  con: Connection,
  asyncJobId: string
): Promise<DeploymentResult> {
  const queryStr = `SELECT sf_devops__Full_Deploy__c, sf_devops__Check_Deploy__c, sf_devops__Test_Level__c, sf_devops__Run_Tests__c, sf_devops__Completion_Date__c,
                      sf_devops__Status__r.Id, sf_devops__Status__r.CreatedDate, sf_devops__Status__r.CreatedById,
                      sf_devops__Status__r.CreatedBy.Name, sf_devops__Status__r.sf_devops__Message__c, 
                      sf_devops__Status__r.sf_devops__Status__c, sf_devops__Status__r.sf_devops__Error_Details__c                      
                    FROM sf_devops__Deployment_Result__c  
                    WHERE sf_devops__Status__r.Id = '${asyncJobId}'`;

  const resp: QueryResult<DeploymentResult> = await runSafeQuery(con, queryStr);
  return resp.records[0];
}
