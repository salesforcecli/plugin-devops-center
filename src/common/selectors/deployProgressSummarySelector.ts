/*
 * Copyright 2025, Salesforce, Inc.
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
import { ChangeBundleInstall, WorkItemPromote, WorkItem } from '../types';
import { runSafeQuery } from './selectorUtils';

// This type will be defined here as it is sepecific from this function
export type DeploySummaryQueryResult = {
  sf_devops__Work_Item_Promotes__r: QueryResult<WorkItemPromote> | null;
  sf_devops__Change_Bundle_Installs__r: QueryResult<ChangeBundleInstall> | null;
  sf_devops__Work_Items__r: QueryResult<WorkItem> | null;
  sf_devops__Operation__c: string | null;
};

/**
 * Returns the data necessary to create the deploy summary (or part of it).
 */
export async function selectDeployAORSummaryDataById(
  con: Connection,
  aorId: string
): Promise<DeploySummaryQueryResult> {
  const queryStr = `SELECT Id, sf_devops__Operation__c,
                    (SELECT sf_devops__Pipeline_Stage__r.Name, sf_devops__Pipeline_Stage__r.sf_devops__Environment__r.sf_devops__Named_Credential__c, sf_devops__Pipeline_Stage__r.sf_devops__Environment__r.Name, sf_devops__Work_Item__r.Name FROM sf_devops__Work_Item_Promotes__r),
                    (SELECT sf_devops__Change_Bundle__r.Id, sf_devops__Change_Bundle__r.sf_devops__Version_Name__c, sf_devops__Environment__r.Id FROM sf_devops__Change_Bundle_Installs__r),
                    (SELECT Name FROM sf_devops__Work_Items__r)
                    FROM sf_devops__Async_Operation_Result__c 
                    WHERE Id = '${aorId}'`;

  const resp: QueryResult<DeploySummaryQueryResult> = await runSafeQuery(con, queryStr);
  return resp.records[0];
}
