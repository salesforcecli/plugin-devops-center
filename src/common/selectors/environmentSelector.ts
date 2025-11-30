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
import { PipelineStage } from '../types';
import { runSafeQuery } from './selectorUtils';

// This type will be defined here as it is sepecific from this function
export type EnvQueryResult = {
  Name: string;
  sf_devops__Pipeline_Stages__r: QueryResult<PipelineStage>;
};

/**
 * Returns the named credential and pipeline stage name associated with the envId sent
 */
export async function selectPipelineStageByEnvironment(con: Connection, envId: string): Promise<EnvQueryResult> {
  const queryStr = `SELECT Name, 
                    (SELECT Name FROM sf_devops__Pipeline_Stages__r)
                    FROM sf_devops__Environment__c 
                    WHERE Id = '${envId}'`;

  const resp: QueryResult<EnvQueryResult> = await runSafeQuery(con, queryStr);
  return resp.records[0];
}
