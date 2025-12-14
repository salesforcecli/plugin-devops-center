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

export async function selectDeployComponentsForCheckDeployByAsynchOpId(
  con: Connection,
  asyncOpId: string
): Promise<DeployComponent[]> {
  const queryStr = `SELECT sf_devops__Source_Component__c, sf_devops__Operation__c, sf_devops__File_Path__c
                    FROM sf_devops__Deploy_Component__c  
                    WHERE sf_devops__Deployment_Result__r.sf_devops__Check_Deploy_Status__c = '${asyncOpId}'`;

  const resp: QueryResult<DeployComponent> = await runSafeQuery(con, queryStr);
  return resp.records;
}
