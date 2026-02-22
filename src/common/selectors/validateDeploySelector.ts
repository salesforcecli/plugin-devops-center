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
