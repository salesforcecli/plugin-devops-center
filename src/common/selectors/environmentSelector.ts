/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
