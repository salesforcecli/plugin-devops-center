/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export type PromotePipelineResult = {
  jobId: string;
  status?: string;
};

export type Pipeline = {
  sf_devops__Project__c: string;
};

export type PipelineStage = {
  Id: string;
  Name: string;
  sf_devops__Branch__r: Branch;
  sf_devops__Pipeline__r: Pipeline;
  sf_devops__Pipeline_Stages__r?: PreviousPipelineStages;
  sf_devops__Environment__r: Environment;
};

export type PreviousPipelineStages = {
  records: PipelineStage[];
};

export type Branch = {
  sf_devops__Name__c: string;
};

export enum TestLevel {
  NoTestRun = 'NoTestRun',
  RunSpecifiedTests = 'RunSpecifiedTests',
  RunLocalTests = 'RunLocalTests',
  RunAllTestsInOrg = 'RunAllTestsInOrg',
}

export interface ApiError extends Error {
  errorCode: string;
  name: string;
}

export type AsyncOperationResult = {
  Id: string;
  sf_devops__Error_Details__c: string | undefined;
  sf_devops__Status__c: string | undefined;
  sf_devops__Message__c: string;
};

export type WorkItem = {
  Name: string;
};

export type WorkItemPromote = {
  sf_devops__Pipeline_Stage__r: PipelineStage;
  sf_devops__Work_Item__r: WorkItem;
};

export type Environment = {
  Id: string;
  sf_devops__Named_Credential__c: string;
};

export type ChangeBundleInstall = {
  sf_devops__Environment__r: Environment;
  sf_devops__Change_Bundle__r: ChangeBundle;
};

export type ChangeBundle = {
  Id: string;
  sf_devops__Version_Name__c: string;
};

export type PromoteOptions = {
  fullDeploy: boolean;
  testLevel: string;
  runTests: string;
  undeployedOnly: boolean;
  checkDeploy: boolean;
  deploymentId: string;
};
