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

import { Connection } from '@salesforce/core';
import { QueryResult } from 'jsforce';
import { PipelineStage } from '../types';
import { runSafeQuery } from './selectorUtils';

/**
 *
 * Returns an array of a pipeline stages filtering by project name.
 */
export async function selectPipelineStagesByProject(con: Connection, projectName: string): Promise<PipelineStage[]> {
  const queryStr = `SELECT Id, sf_devops__Pipeline__r.sf_devops__Project__c, sf_devops__Branch__r.sf_devops__Name__c, (SELECT Id FROM sf_devops__Pipeline_Stages__r)
                    FROM sf_devops__Pipeline_Stage__c  
                    WHERE sf_devops__Pipeline__r.sf_devops__Project__r.Name = '${projectName}'`;

  const resp: QueryResult<PipelineStage> = await runSafeQuery(con, queryStr);
  return resp.records;
}

/**
 *
 * Returns an array of a pipeline stages filtering by environment Id.
 */
export async function selectOnePipelineStageByEnvironmentId(
  con: Connection,
  envId: string
): Promise<PipelineStage | null> {
  const queryStr = `SELECT Id, sf_devops__Pipeline__r.sf_devops__Project__c, sf_devops__Branch__r.sf_devops__Name__c, (SELECT Id FROM sf_devops__Pipeline_Stages__r)
                    FROM sf_devops__Pipeline_Stage__c  
                    WHERE sf_devops__Environment__c = '${envId}'`;

  const resp: QueryResult<PipelineStage> = await runSafeQuery(con, queryStr);
  return resp.records[0];
}
