/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Messages, Org } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { Nullable } from '@salesforce/ts-types';
import { PipelineStage, TestLevel } from '../common';
import { selectPipelineStagesByProject } from '../common/selectors/pipelineStageSelector';
import AsyncOpStreaming from '../streamer/processors/asyncOpStream';
import { colorStatus } from './outputService/outputUtils';
import { AorOutputService } from './outputService/aorOutputService';
import { selectAsyncOperationResultById } from './selectors/asyncOperationResultsSelector';
import { AsyncOperationResult, AsyncOperationStatus, DeployComponent } from './types';
import { selectDeployComponentsByAsyncOpId } from './selectors/deployComponentsSelector';

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
    const error = err as Error;
    if (error.name === 'Query-failedError') {
      throw messages.createError('error.DevopsAppNotInstalled');
    }
    throw err;
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
    if (error.name === 'No-results-foundError') {
      throw messages.createError('error.InvalidAorId', [aorId]);
    }
    throw err;
  }
  return aor;
}

export function getAsyncOperationStreamer(
  org: Org,
  waitTime: Duration,
  idToInspect: string,
  outputService: AorOutputService
): AsyncOpStreaming {
  return new AsyncOpStreaming(org, waitTime, idToInspect, outputService);
}

/**
 *
 * Helper to inspect an array of SF ids to check if it contains the given Id,
 * independently if it is a 15 or 18 characters long.
 *
 * @param idsToInspect array of ids which might contain the given id
 * @param idToFind id to look for
 * @returns true is the array contains the given id
 */
export function containsSfId(idsToInspect: string[], idToFind: string): boolean {
  let shortId: string;
  if (idToFind.length === 18) {
    shortId = idToFind.substring(0, 15);
  } else if (idToFind.length === 15) {
    shortId = idToFind;
  } else {
    return false;
  }
  return idsToInspect.some((k) => k.startsWith(shortId));
}

/**
 *
 * Helper to compare to SF Ids independently if they are 15 or 18 characters long.
 *
 * @param firstId
 * @param secondId
 * @returns true is the Ids match
 */
export function matchesSfId(firstId: string, secondId: string): boolean {
  return containsSfId([firstId], secondId);
}

/**
 * Helper to convert an sObject into an array of {key : value}
 * and format the keys.
 *
 * @param sObj sObject to convert.
 * @returns an array of {key : value}
 */
export function sObjectToArrayOfKeyValue(sObj: object): Array<{ key: string; value: unknown }> {
  const acumulator = [];
  return Object.entries(sObj).reduce<Array<{ key: string; value: unknown }>>((res, [key, value]) => {
    if (key !== 'attributes') {
      if (typeof value === 'object' && value !== null) {
        return res.concat(sObjectToArrayOfKeyValue(value as object));
      } else if (key === 'sf_devops__Status__c') {
        return res.concat({ key: formatFieldName(key), value: colorStatus(value as AsyncOperationStatus) });
      } else {
        return res.concat({ key: formatFieldName(key), value: value as string | number | boolean });
      }
    }
    return res;
  }, acumulator);
}

/**
 * Helper to remove the prefix, sufix and underscores in a DOCe sObject field name.
 *
 * @param fieldName DOCe field name.
 * @returns formatted field name.
 */
export function formatFieldName(fieldName: string): string {
  return fieldName.replace('sf_devops__', '').replace('__c', '').replace('_', '');
}

/**
 * Helper to return a formatted DeployComponent list (Type/Name filled).
 *
 * @param con The connection needed for the query
 * @param asyncOpId The Id of the AsyncOperation
 * @returns A list of DeployComponent
 */
export async function getFormattedDeployComponentsByAyncOpId(
  con: Connection,
  asyncOpId: string
): Promise<DeployComponent[]> {
  const components: DeployComponent[] = await selectDeployComponentsByAsyncOpId(con, asyncOpId);

  components.forEach((component) => {
    component.Type = component.sf_devops__Source_Component__c.split(':')[0];
    component.Name = component.sf_devops__Source_Component__c.split(':')[1];
  });

  return components;
}
