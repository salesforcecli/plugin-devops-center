/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { QueryResult } from 'jsforce';
import { Connection } from '@salesforce/core';
import { ChangeBundleInstall, WorkItemPromote, WorkItem } from '../types';

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
export async function selectDeployAORSummaryData(con: Connection, aorId: string): Promise<DeploySummaryQueryResult> {
  const queryStr = `SELECT Id, sf_devops__Operation__c,
                    (SELECT sf_devops__Pipeline_Stage__r.Name, sf_devops__Pipeline_Stage__r.sf_devops__Environment__r.sf_devops__Named_Credential__c, sf_devops__Work_Item__r.Name FROM sf_devops__Work_Item_Promotes__r),
                    (SELECT sf_devops__Change_Bundle__r.Id, sf_devops__Change_Bundle__r.sf_devops__Version_Name__c, sf_devops__Environment__r.Id FROM sf_devops__Change_Bundle_Installs__r),
                    (SELECT Name from sf_devops__Work_Items__r)
                    FROM sf_devops__Async_Operation_Result__c 
                    WHERE Id = '${aorId}'`;
  const resp: QueryResult<DeploySummaryQueryResult> = await con.query(queryStr);
  return resp.records[0];
}
