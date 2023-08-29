/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { QueryResult } from 'jsforce';
import { AsyncOperationResult, ChangeBundleInstall, DeploymentResult } from '../types';
import { runSafeQuery } from './selectorUtils';

// This type will be defined here as it is sepecific from this function
export type DeploymentResultCheckDeploy = {
  sf_devops__Check_Deploy__c: boolean | null;
};
export type CheckDeploymentResultWithChangeBundleInstalls = {
  sf_devops__Change_Bundle_Installs__r: QueryResult<ChangeBundleInstall>;
  sf_devops__Check_Deploy_Status__r: AsyncOperationResult;
} & DeploymentResult;

/**
 *
 * Returns deployment result record filtering by async job id.
 */
export async function selectOneDeploymentResultByAsyncJobId(
  con: Connection,
  asyncJobId: string
): Promise<DeploymentResult | null> {
  const queryStr = `SELECT sf_devops__Full_Deploy__c, sf_devops__Check_Deploy__c, sf_devops__Test_Level__c, sf_devops__Run_Tests__c, sf_devops__Completion_Date__c,
                      sf_devops__Status__r.Id, sf_devops__Status__r.CreatedDate, sf_devops__Status__r.CreatedById,
                      sf_devops__Status__r.CreatedBy.Name, sf_devops__Status__r.sf_devops__Message__c, 
                      sf_devops__Status__r.sf_devops__Status__c, sf_devops__Status__r.sf_devops__Error_Details__c                      
                    FROM sf_devops__Deployment_Result__c  
                    WHERE sf_devops__Status__r.Id = '${asyncJobId}'`;

  const resp: QueryResult<DeploymentResult> = await runSafeQuery(con, queryStr, true);
  return resp.totalSize > 0 ? resp.records[0] : null;
}

/**
 *
 * Returns if a deployment result is from a Check-Deploy by async job id.
 */
export async function isCheckDeploy(con: Connection, asyncJobId: string): Promise<boolean> {
  const queryStr = `SELECT sf_devops__Check_Deploy__c,
                      sf_devops__Status__r.Id, sf_devops__Check_Deploy_Status__r.Id     
                    FROM sf_devops__Deployment_Result__c  
                    WHERE sf_devops__Status__r.Id = '${asyncJobId}'
                    OR sf_devops__Check_Deploy_Status__r.Id = '${asyncJobId}'`;

  const resp: QueryResult<DeploymentResultCheckDeploy> = await runSafeQuery(con, queryStr, true);
  const result = resp.totalSize > 0 && !!resp.records[0].sf_devops__Check_Deploy__c;
  return result;
}
/**
 *
 * Returns deployment result record with Change Bundle Installs filtering by check deploy job id.
 */
export async function selectOneDeploymentResultWithChangeBundleInstallsByAsyncJobId(
  con: Connection,
  asyncJobId: string
): Promise<CheckDeploymentResultWithChangeBundleInstalls | null> {
  const queryStr = `SELECT sf_devops__Check_Deploy__c, sf_devops__Deployment_Id__c, sf_devops__Check_Deploy_Status__r.sf_devops__Status__c,
                    (SELECT sf_devops__Environment__c FROM sf_devops__Change_Bundle_Installs__r)
                    FROM sf_devops__Deployment_Result__c  
                    WHERE sf_devops__Check_Deploy_Status__c = '${asyncJobId}' AND sf_devops__Check_Deploy__c = TRUE`;

  const resp: QueryResult<CheckDeploymentResultWithChangeBundleInstalls> = await runSafeQuery(con, queryStr, true);
  return resp.totalSize > 0 ? resp.records[0] : null;
}
