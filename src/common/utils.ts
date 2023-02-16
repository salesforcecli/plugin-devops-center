/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Messages, Org, SfError } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { getString, Nullable } from '@salesforce/ts-types';
import { ApiError, PipelineStage, TestLevel } from '../common';
import { selectPipelineStagesByProject } from '../common/selectors/pipelineStageSelector';
import AsyncOpStreaming from '../streamer/processors/asyncOpStream';
import { selectAsyncOperationResultById } from './selectors/asyncOperationResultsSelector';
import { AsyncOperationResult } from './types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

/**
 * @description validates the following:
 * - if RunSpecifiedTests is specified, then it needs to indicate tests to run.
 * - if other than RunSpecifiedTests is specified, then it can't indicate tests to run.
 * @param testLevel specified test level
 * @param tests specific tests to run
 */
export function validateTestFlags(testLevel: Nullable<TestLevel>, tests: Nullable<string[]>): void {
  if (testLevel === TestLevel.RunSpecifiedTests && (tests ?? []).length === 0) {
    throw messages.createError('error.NoTestsSpecified');
  } else if (testLevel !== TestLevel.RunSpecifiedTests && tests) {
    throw messages.createError('error.InvalidRunTests');
  }
}

/**
 *
 * Query the target org to get a pipeline stage filtering by project name and branch name.
 * Also uses the same query to validate that Devops Center is installed in the target org.
 *
 * @param targetOrg Org. Target org.
 * @param projectName string. Name of the project.
 * @param branchName string. Name of the branch.
 * @throws if Devops Center is not installed in the target org.
 * @throws if it cant' find the given project.
 * @throws if it cant' find the a pipeline stge that matches the given branch.
 */
export async function fetchAndValidatePipelineStage(
  targetOrg: Org,
  projectName: string,
  branchName: string
): Promise<PipelineStage> {
  let stages: PipelineStage[];
  try {
    stages = await selectPipelineStagesByProject(targetOrg.getConnection(), projectName);
  } catch (err) {
    const error = err as ApiError;
    if (error.errorCode === 'INVALID_TYPE') {
      throw messages.createError('error.DevopsAppNotInstalled');
    }
    throw new SfError(getString(err, 'errorMessage', 'unknown'), getString(err, 'errorStatusCode', 'unknown'));
  }
  if (!stages.length) {
    throw messages.createError('error.ProjectNotFound', [projectName]);
  }
  // find stage by branch name
  const stage: PipelineStage | undefined = stages.find(
    (s) => s.sf_devops__Branch__r.sf_devops__Name__c.toUpperCase() === branchName.toUpperCase()
  );
  if (!stage) {
    throw messages.createError('error.BranchNotFound', [branchName, projectName]);
  }
  return stage;
}

export async function fetchAsyncOperationResult(con: Connection, aorId: string): Promise<AsyncOperationResult> {
  let aor: AsyncOperationResult;
  try {
    aor = await selectAsyncOperationResultById(con, aorId);
  } catch (err) {
    const error = err as Error;
    if (error.name === 'SingleRecordQuery_NoRecords') {
      throw messages.createError('error.InvalidAorId', [aorId]);
    }
    throw err;
  }
  return aor;
}

export function getAsyncOperationStreamer(org: Org, waitTime: Duration, idToInspect: string): AsyncOpStreaming {
  return new AsyncOpStreaming(org, waitTime, idToInspect);
}
