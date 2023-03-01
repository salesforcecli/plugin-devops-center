/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, @typescript-eslint/no-non-null-assertion */

import { Connection, Messages } from '@salesforce/core';
import { AsyncOperationType } from '../constants';
import { DeploySummaryQueryResult, selectDeployAORSummaryDataById } from '../selectors/deployProgressSummarySelector';
import { EnvQueryResult, selectPipelineStageByEnvironment } from '../selectors/environmentSelector';
import { selectNamedCredentialByName } from '../selectors/namedCredentialSelector';
import { selectWorkItemsByChangeBundles, WorkItemsQueryResult } from '../selectors/workItemSelector';
import { ChangeBundle, ChangeBundleInstall, WorkItem, WorkItemPromote } from '../types';
import { OutputService } from './outputService';

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.output');

/**
 * Builds the appropiate DeploySummaryOutputService
 *
 * @author JuanStenghele-sf
 */
export class DeploySummaryBuilder {
  private con: Connection;

  public constructor(con: Connection) {
    this.con = con;
  }

  /**
   * Builds the appropiate DeploySummaryOutputService
   */
  public async build(branch: string, aorId: string): Promise<OutputService | undefined> {
    // We get the operation from this query
    const queryResp: DeploySummaryQueryResult = await selectDeployAORSummaryDataById(this.con, aorId);

    switch (queryResp.sf_devops__Operation__c) {
      case AsyncOperationType.AD_HOC_PROMOTE:
        return new AdHocDeploySummaryOutputService(
          queryResp.sf_devops__Work_Item_Promotes__r!.records,
          this.con,
          branch
        );

      case AsyncOperationType.VERSIONED_PROMOTE:
        return new VersionedDeploySummaryOutputService(
          queryResp.sf_devops__Change_Bundle_Installs__r!.records,
          this.con,
          branch
        );

      case AsyncOperationType.SOUP_PROMOTE:
        return new SoupDeploySummaryOutputService(
          queryResp.sf_devops__Change_Bundle_Installs__r!.records,
          queryResp.sf_devops__Work_Items__r!.records,
          this.con,
          branch
        );

      default:
        break;
    }
  }
}

export abstract class DeploySummaryOutputService implements OutputService {
  protected con: Connection;

  protected branch: string;
  protected stageName: string;
  protected orgUrl: string;

  public constructor(con: Connection, branch: string) {
    this.con = con;
    this.branch = branch;
  }

  public async printOpSummary(): Promise<void> {
    await this.buildSummary();
    this.printSummary();
  }

  /**
   * Gets all the attributes needed to call printSummary()
   */
  protected abstract buildSummary(): Promise<void>;

  /**
   * Prints the specific summary for this deploy type
   */
  protected abstract printSummary(): void;
}

/**
 * Service class used to print the operation summary of an Ad Hoc deploy
 *
 * @author JuanStenghele-sf
 */
class AdHocDeploySummaryOutputService extends DeploySummaryOutputService {
  private workItemsPromote: WorkItemPromote[];
  private workItems: string[];

  public constructor(workItemsPromote: WorkItemPromote[], con: Connection, branch: string) {
    super(con, branch);
    this.workItemsPromote = workItemsPromote;
  }

  protected async buildSummary(): Promise<void> {
    this.stageName = this.workItemsPromote[0].sf_devops__Pipeline_Stage__r.Name;

    this.workItems = this.workItemsPromote.map((workItem) => workItem.sf_devops__Work_Item__r.Name);

    const namedCredential: string =
      this.workItemsPromote[0].sf_devops__Pipeline_Stage__r.sf_devops__Environment__r.sf_devops__Named_Credential__c;
    this.orgUrl = (await selectNamedCredentialByName(this.con, namedCredential)).Endpoint;
  }

  protected printSummary(): void {
    const itemsLabel =
      this.workItems.length === 1 ? output.getMessage('output.item') : output.getMessage('output.items');
    const workItems = this.workItems.join(', ');
    console.log(
      output.getMessage('output.adhoc-deploy-summary', [
        this.stageName,
        itemsLabel,
        workItems,
        this.branch,
        this.orgUrl,
      ])
    );
  }
}

/**
 * Abstract class with some common logic for versioned and soup summary output services
 *
 * @author JuanStenghele-sf
 */
abstract class VersionedOrSoupSummaryOutputService extends DeploySummaryOutputService {
  protected changeBundleInstalls: ChangeBundleInstall[];
  protected workItems: Map<string, string[]>;

  public constructor(changeBundleInstalls: ChangeBundleInstall[], con: Connection, branch: string) {
    super(con, branch);
    this.changeBundleInstalls = changeBundleInstalls;
  }

  /**
   * Common logic for soup and versioned deploy output services
   */
  protected async buildCommonSummary(): Promise<void> {
    // We get the stage name and the org url
    const envId: string = this.changeBundleInstalls[this.changeBundleInstalls.length - 1].sf_devops__Environment__r.Id;
    const envQueryResp: EnvQueryResult = await selectPipelineStageByEnvironment(this.con, envId);

    this.stageName = envQueryResp.sf_devops__Pipeline_Stages__r.records[0].Name;

    const namedCredential: string = envQueryResp.sf_devops__Named_Credential__c;
    this.orgUrl = (await selectNamedCredentialByName(this.con, namedCredential)).Endpoint;
  }

  protected printSummary(): void {
    const bundlesSummary: string[] = [];
    this.workItems.forEach((workItems: string[], bundleVersionName: string) => {
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
        this.stageName,
        bundlesSummary.join('; '),
        this.branch,
        this.orgUrl,
      ])
    );
  }

  protected abstract buildSummary(): Promise<void>;
}

/**
 * Service class used to print the operation summary of a Versioned deploy
 *
 * @author JuanStenghele-sf
 */
class VersionedDeploySummaryOutputService extends VersionedOrSoupSummaryOutputService {
  protected async buildSummary(): Promise<void> {
    // We need to get the stage name and the org url first
    await this.buildCommonSummary();

    // Then we need to get the WIs for every CB
    // We will create a map that stores CB.Id -> CB.versionName
    const changeBundles: Map<string, string> = new Map();
    for (const changeBundleInstall of this.changeBundleInstalls) {
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
    this.workItems = workItems;
  }
}

/**
 * Service class used to print the operation summary of a soup deploy
 *
 * @author JuanStenghele-sf
 */
class SoupDeploySummaryOutputService extends VersionedOrSoupSummaryOutputService {
  private rawWorkItems: WorkItem[];

  public constructor(
    changeBundleInstalls: ChangeBundleInstall[],
    workItems: WorkItem[],
    con: Connection,
    branch: string
  ) {
    super(changeBundleInstalls, con, branch);
    this.rawWorkItems = workItems;
  }

  protected async buildSummary(): Promise<void> {
    // We need to get the stage name and the org url first
    await this.buildCommonSummary();

    const changeBundle: ChangeBundle = this.changeBundleInstalls[0].sf_devops__Change_Bundle__r;

    // Then we build a map with the version name -> WIs to match the versioned case
    const workItems: Map<string, string[]> = new Map();
    workItems.set(
      changeBundle.sf_devops__Version_Name__c,
      this.rawWorkItems.map((wi) => wi.Name)
    );
    this.workItems = workItems;
  }
}