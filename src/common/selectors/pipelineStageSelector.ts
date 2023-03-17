/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
