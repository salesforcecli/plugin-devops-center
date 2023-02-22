/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, class-methods-use-this , no-case-declarations */

import { Connection, Messages } from '@salesforce/core';
import { ChangeBundle, ChangeBundleInstall, WorkItem, WorkItemPromote } from '../types';
import { DeploySummaryQueryResult, selectDeployAORSummaryData } from '../selectors/deployProgressSummarySelector';
import { selectOrgUrl } from '../selectors/endpointSelector';
import { EnvQueryResult, selectPipelineStageByEnvironment } from '../selectors/environmentSelector';
import { WorkItemsQueryResult, selectWorkItemsByChangeBundles } from '../selectors/workItemSelector';
import { AsyncOperationType } from '../constants';
import { OutputService } from './outputService';

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.output');

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
 * Inner type to avoid duplicated code
 */
type VersionedOrSoupDeploySummary = {
  stageName: string;
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
  public printAsyncRunInfo(aorId: string): void {
    console.log(output.getMessage('output.async-run-info', [aorId, aorId]));
  }

  /**
   * Given an aorId prints the deployment wanted to be done summary
   * We also receive the branch as it is a command's param
   */
  public async printProgressSummary(aorId: string, branch: string): Promise<void> {
    // We get most of the data we need from this query
    const queryResp: DeploySummaryQueryResult = await selectDeployAORSummaryData(this.con, aorId);

    let summary: DeploySummary;
    switch (queryResp.sf_devops__Operation__c) {
      case AsyncOperationType.AD_HOC_PROMOTE:
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        summary = await this.processAdHocDeploy(branch, queryResp.sf_devops__Work_Item_Promotes__r!.records);
        this.printAdHocDeploySummary(summary);
        break;

      case AsyncOperationType.VERSIONED_PROMOTE:
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        summary = await this.processVersionedDeploy(branch, queryResp.sf_devops__Change_Bundle_Installs__r!.records);
        this.printVersionedOrSoupDeploySummary(summary);
        break;

      case AsyncOperationType.SOUP_PROMOTE:
        summary = await this.processSoupDeploy(
          branch,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          queryResp.sf_devops__Change_Bundle_Installs__r!.records,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          queryResp.sf_devops__Work_Items__r!.records
        );
        this.printVersionedOrSoupDeploySummary(summary);
        break;

      default:
        // Error here
        break;
    }
  }

  /**
   * Prints an adHoc deploy summary
   */
  private printAdHocDeploySummary(summary: DeploySummary): void {
    const itemsLabel =
      (summary.workItems as string[]).length === 1
        ? output.getMessage('output.item')
        : output.getMessage('output.items');
    const workItems = (summary.workItems as string[]).join(', ');
    console.log(
      output.getMessage('output.adhoc-deploy-summary', [
        summary.stageName,
        itemsLabel,
        workItems,
        summary.branchName,
        summary.orgUrl,
      ]) + '\n'
    );
  }

  /**
   * Prints a versioned or soup deploy summary
   */
  private printVersionedOrSoupDeploySummary(summary: DeploySummary): void {
    const bundlesSummary: string[] = [];
    (summary.workItems as Map<string, string[]>).forEach((workItems: string[], bundleVersionName: string) => {
      const itemsLabel = workItems.length === 1 ? output.getMessage('output.item') : output.getMessage('output.items');
      bundlesSummary.push(
        output.getMessage('output.version-or-soup-deploy-summary-wis', [
          itemsLabel,
          workItems.join(', '),
          bundleVersionName,
        ])
      );
    });
    console.log(
      output.getMessage('output.version-or-soup-deploy-summary', [
        summary.stageName,
        bundlesSummary.join('; '),
        summary.branchName,
        summary.orgUrl,
      ]) + '\n'
    );
  }

  /**
   * Builds a DeploySummary for an adHoc deploy
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
   * Builds a VersionedOrSoupDeploySummary for a versioned or soup deploy
   */
  private async processVersionedOrSoupDeploy(
    changeBundleInstalls: ChangeBundleInstall[]
  ): Promise<VersionedOrSoupDeploySummary> {
    // We get the stage name and the org url first
    const envId: string = changeBundleInstalls[changeBundleInstalls.length - 1].sf_devops__Environment__r.Id;
    const envQueryResp: EnvQueryResult = await selectPipelineStageByEnvironment(this.con, envId);

    const stageName: string = envQueryResp.sf_devops__Pipeline_Stages__r.records[0].Name;

    const namedCredential: string = envQueryResp.sf_devops__Named_Credential__c;
    const orgUrl: string = await selectOrgUrl(this.con, namedCredential);

    return {
      stageName,
      orgUrl,
    };
  }

  /**
   * Builds a DeploySummary for a versioned deploy
   */
  private async processVersionedDeploy(
    branchName: string,
    changeBundleInstalls: ChangeBundleInstall[]
  ): Promise<DeploySummary> {
    // We need to get the stage name and the org url first
    const commonProcessing: VersionedOrSoupDeploySummary = await this.processVersionedOrSoupDeploy(
      changeBundleInstalls
    );

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
      stageName: commonProcessing.stageName,
      workItems,
      branchName,
      orgUrl: commonProcessing.orgUrl,
    };
  }

  /**
   * Builds a DeploySummary for a versioned deploy
   */
  private async processSoupDeploy(
    branchName: string,
    changeBundleInstalls: ChangeBundleInstall[],
    workItemsParam: WorkItem[]
  ): Promise<DeploySummary> {
    // We need to get the stage name and the org url first
    const commonProcessing: VersionedOrSoupDeploySummary = await this.processVersionedOrSoupDeploy(
      changeBundleInstalls
    );

    const changeBundle: ChangeBundle = changeBundleInstalls[0].sf_devops__Change_Bundle__r;

    // Then we build a map with the version name -> WIs to match the versioned case
    const workItems: Map<string, string[]> = new Map();
    workItems.set(
      changeBundle.sf_devops__Version_Name__c,
      workItemsParam.map((wi) => wi.Name)
    );

    return {
      stageName: commonProcessing.stageName,
      workItems,
      branchName,
      orgUrl: commonProcessing.orgUrl,
    };
  }
}
