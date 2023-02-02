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
  sf_devops__Branch__r: Branch;
  sf_devops__Pipeline__r: Pipeline;
  sf_devops__Pipeline_Stages__r?: PreviousPipelineStages;
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
