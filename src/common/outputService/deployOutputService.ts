/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console */

import { Connection } from '@salesforce/core';
import { ChangeBundleInstall, WorkItemPromote } from '../types';
import { DeploySummaryQueryResult, selectDeployAORSummaryData } from '../selectors/deployProgressSummarySelector';
import { selectOrgUrl } from '../selectors/endpointSelector';
import { EnvQueryResult, selectPipelineStageByEnvironment } from '../selectors/environmentSelector';
import { WorkItemsQueryResult, selectWorkItemsByChangeBundles } from '../selectors/changeBundleSelector';
import { OutputService } from './outputService';

/**
 * This type is used for storing all the info needed for the deployment summary
 */
type DeploySummary = {
  stageName: string;
  // It is a map if it is a soup or versioned promote
  // It is an array of strings if it is an ad hoc promote
  workItems: Map<string, string[]> | string[];
  branchName: string;
  orgUrl: string;
};

/**
 * Service class to print the deploy output
 *
 * @author JuanStenghele-sf
 */
export class DeployOutputService extends OutputService {
  protected con: Connection;

  public constructor(con: Connection) {
    super();
    this.con = con;
  }

  /**
   * Prints this message when the user uses the async flag
   */
  public static printAsyncRunInfo(aorId: string): void {
    console.log(
      'Deploy has been queued.\n' +
        `Run "sf deploy pipeline resume --job-id ${aorId} to resume watching the deploy.\n` +
        `Run "sf deploy pipeline report --job-id ${aorId} to get the latest status.`
    );
  }

  /**
   * Prints an adHoc deploy summary
   */
  private static printAdHocDeploySummary(summary: DeploySummary): void {
    console.log(
      `DevOps Center pipeline stage ${summary.stageName} being updated with metadata associated with work ${
        (summary.workItems as string[]).length === 1 ? 'item' : 'items'
      } ` +
        `${(summary.workItems as string[]).join(', ')}. Deploying metadata from ${
          summary.branchName
        } branch to target org ${summary.orgUrl}.\n`
    );
  }

  /**
   * Prints a versioned or soup deploy summary
   */
  private static printVersoupDeploySummary(summary: DeploySummary): void {
    const bundlesSummary: string[] = [];
    (summary.workItems as Map<string, string[]>).forEach((workItems: string[], bundleVersionName: string) => {
      bundlesSummary.push(
        `work ${workItems.length === 1 ? 'item' : 'items'} ${workItems.join(', ')} in bundle ${bundleVersionName}`
      );
    });
    console.log(
      `DevOps Center pipeline stage ${summary.stageName} being updated with metadata associated with ` +
        `${bundlesSummary.join('; ')}. Deploying metadata from ${summary.branchName} branch to target org ${
          summary.orgUrl
        }.\n`
    );
  }

  /**
   * Given an aorId prints the deployment wanted to be done summary
   * We also receive the branch as it is a command's param
   */
  public async printProgressSummary(aorId: string, branch: string): Promise<void> {
    // We get most of the data we need from this query
    const queryResp: DeploySummaryQueryResult = await selectDeployAORSummaryData(this.con, aorId);

    let summary: DeploySummary;
    if (queryResp.sf_devops__Work_Item_Promotes__r !== null) {
      // It is an AD HOC PROMOTE
      const workItemsPromote: WorkItemPromote[] = queryResp.sf_devops__Work_Item_Promotes__r.records;
      summary = await this.processAdHocDeploy(branch, workItemsPromote);
      DeployOutputService.printAdHocDeploySummary(summary);
    } else if (queryResp.sf_devops__Change_Bundle_Installs__r !== null) {
      // It is a versioned or soup promote
      // We will treat them similarly
      const versoupQueryResp: ChangeBundleInstall[] = queryResp.sf_devops__Change_Bundle_Installs__r.records;
      summary = await this.processVersoupDeploy(branch, versoupQueryResp);
      DeployOutputService.printVersoupDeploySummary(summary);
    }
  }

  /**
   * Builds a DeploySummary knowing it is an adHoc deploy case
   */
  private async processAdHocDeploy(branchName: string, workItemsPromotes: WorkItemPromote[]): Promise<DeploySummary> {
    const stageName: string = workItemsPromotes[0].sf_devops__Pipeline_Stage__r.Name;

    const workItems: string[] = workItemsPromotes.map((workItem) => workItem.sf_devops__Work_Item__r.Name);

    const namedCredential: string =
      workItemsPromotes[0].sf_devops__Pipeline_Stage__r.sf_devops__Environment__r.sf_devops__Named_Credential__c;
    const orgUrl: string = await selectOrgUrl(this.con, namedCredential);

    return {
      stageName,
      workItems,
      branchName,
      orgUrl,
    };
  }

  /**
   * Builds a DeploySummary knowing it is a versioned or soup deploy case
   */
  private async processVersoupDeploy(
    branchName: string,
    changeBundleInstalls: ChangeBundleInstall[]
  ): Promise<DeploySummary> {
    // We need to get the stage name and the org url first
    const envId: string = changeBundleInstalls[changeBundleInstalls.length - 1].sf_devops__Environment__r.Id;
    const envQueryResp: EnvQueryResult = await selectPipelineStageByEnvironment(this.con, envId);

    const stageName: string = envQueryResp.sf_devops__Pipeline_Stages__r.records[0].Name;

    const namedCredential: string = envQueryResp.sf_devops__Named_Credential__c;
    const orgUrl: string = await selectOrgUrl(this.con, namedCredential);

    // Then we need to get the WIs for every CB
    // We will create a map that stores CB.Id -> CB.versionName
    const changeBundles: Map<string, string> = new Map();
    for (const changeBundleInstall of changeBundleInstalls) {
      const changeBundle = changeBundleInstall.sf_devops__Change_Bundle__r;
      changeBundles.set(changeBundle.Id, changeBundle.sf_devops__Version_Name__c);
    }

    // Next we will create a map that stores CB.versionName -> WIs.Name
    // For that we will need to query the WIs associated with the CBs
    const workItemsQueryResp: WorkItemsQueryResult[] = await selectWorkItemsByChangeBundles(
      this.con,
      Array.from(changeBundles.keys())
    );
    const workItems: Map<string, string[]> = new Map();
    for (const record of workItemsQueryResp) {
      const versionName: string | undefined = changeBundles.get(record.Id);
      if (versionName) {
        workItems.set(
          versionName,
          record.sf_devops__Work_Items__r.records.map((wi) => wi.Name)
        );
      }
    }

    return {
      stageName,
      workItems,
      branchName,
      orgUrl,
    };
  }
}
