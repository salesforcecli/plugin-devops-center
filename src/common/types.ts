/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export type PromotePipelineResult = {
  jobId: string;
  status?: string;
  message?: string;
  errorDetails?: string;
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

export type DeploymentResult = {
  sf_devops__Full_Deploy__c: boolean;
  sf_devops__Check_Deploy__c: boolean;
  sf_devops__Completion_Date__c: string;
  sf_devops__Test_Level__c: string;
  sf_devops__Run_Tests__c: string;
  sf_devops__Status__r: AsyncOperationResult;
};

export type AsyncOperationResult = {
  Id: string;
  CreatedDate?: string;
  CreatedById?: string;
  CreatedBy?: User;
  LastModifiedDate?: string;
  sf_devops__Message__c?: string;
  sf_devops__Status__c?: AsyncOperationStatus;
  sf_devops__Error_Details__c?: string;
};

export type User = {
  Id?: string;
  Name: string;
};

export enum AsyncOperationStatus {
  Error = 'Error',
  Completed = 'Completed',
  Ignored = 'Ignored',
  InProgress = 'In Progress',
}

export type NamedCredential = {
  Endpoint: string;
};

export type DeployComponent = {
  sf_devops__Source_Component__c: string;
  sf_devops__Operation__c: string;
  sf_devops__File_Path__c: string;
  Type?: string;
  Name?: string;
};
