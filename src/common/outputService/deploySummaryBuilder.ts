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
import { selectWorkItemsByChangeBundles, WorkItemsQueryResult } from '../selectors/workItemSelector';
import { selectValidateDeployAORSummaryDataById } from '../selectors/validateDeploySelector';
import { ChangeBundle, ChangeBundleInstall, WorkItem, WorkItemPromote } from '../types';
import { AbstractOutputService, OutputFlags, OutputService } from './outputService';

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
  public async build(branch: string, aorId: string, flags: OutputFlags): Promise<OutputService | undefined> {
    // We get the operation from this query
    const queryResp: DeploySummaryQueryResult = await selectDeployAORSummaryDataById(this.con, aorId);

    switch (queryResp.sf_devops__Operation__c) {
      case AsyncOperationType.AD_HOC_PROMOTE:
        return new AdHocDeploySummaryOutputService(
          queryResp.sf_devops__Work_Item_Promotes__r!.records,
          this.con,
          branch,
          flags
        );

      case AsyncOperationType.VERSIONED_PROMOTE:
        return new VersionedDeploySummaryOutputService(
          queryResp.sf_devops__Change_Bundle_Installs__r!.records,
          this.con,
          branch,
          flags
        );

      case AsyncOperationType.SOUP_PROMOTE:
        return new SoupDeploySummaryOutputService(
          queryResp.sf_devops__Change_Bundle_Installs__r!.records,
          queryResp.sf_devops__Work_Items__r!.records,
          this.con,
          branch,
          flags
        );

      case AsyncOperationType.CHECK_DEPLOY: {
        const response: ChangeBundleInstall[] = await selectValidateDeployAORSummaryDataById(this.con, aorId);
        return new ValidateDeploySummaryOutputService(response, this.con, branch, flags);
      }

      default:
        break;
    }
  }
}

export abstract class DeploySummaryOutputService<T extends OutputFlags> extends AbstractOutputService<T> {
  protected con: Connection;

  protected branch: string;
  protected stageName: string;
  protected environmentName: string;

  public constructor(con: Connection, branch: string, flags: T) {
    super(flags);
    this.con = con;
    this.branch = branch;
  }

  public async printOpSummary(): Promise<void> {
    await this.buildSummary();
    if (this.flags.concise) {
      this.printConciseSummary();
    } else {
      this.printSummary();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  protected printConciseSummary(): void {
    console.log(output.getMessage('output.concise.summary', [this.stageName, this.branch, this.environmentName]));
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
class AdHocDeploySummaryOutputService<T extends OutputFlags> extends DeploySummaryOutputService<T> {
  private workItemsPromote: WorkItemPromote[];
  private workItems: string[];

  public constructor(workItemsPromote: WorkItemPromote[], con: Connection, branch: string, flags: T) {
    super(con, branch, flags);
    this.workItemsPromote = workItemsPromote;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async buildSummary(): Promise<void> {
    this.stageName = this.workItemsPromote[0].sf_devops__Pipeline_Stage__r.Name;

    this.workItems = this.workItemsPromote.map((workItem) => workItem.sf_devops__Work_Item__r.Name);

    this.environmentName = this.workItemsPromote[0].sf_devops__Pipeline_Stage__r.sf_devops__Environment__r.Name;
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
        this.environmentName,
      ])
    );
  }
}

/**
 * Abstract class with some common logic for versioned and soup summary output services
 *
 * @author JuanStenghele-sf
 */
abstract class VersionedOrSoupSummaryOutputService<T extends OutputFlags> extends DeploySummaryOutputService<T> {
  protected changeBundleInstalls: ChangeBundleInstall[];
  protected workItems: Map<string, string[]>;

  public constructor(changeBundleInstalls: ChangeBundleInstall[], con: Connection, branch: string, flags: T) {
    super(con, branch, flags);
    this.changeBundleInstalls = changeBundleInstalls;
  }

  /**
   * Common logic for soup and versioned deploy output services
   */
  protected async buildCommonSummary(): Promise<void> {
    // We get the stage name and the org url
    const envId: string = this.changeBundleInstalls[this.changeBundleInstalls.length - 1].sf_devops__Environment__r.Id;
    const pipelineInfo: PipelineInfo = await getPipelineInfo(this.con, envId);
    this.stageName = pipelineInfo.stageName;
    this.environmentName = pipelineInfo.environmentName;
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
        this.environmentName,
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
class VersionedDeploySummaryOutputService<T extends OutputFlags> extends VersionedOrSoupSummaryOutputService<T> {
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
class SoupDeploySummaryOutputService<T extends OutputFlags> extends VersionedOrSoupSummaryOutputService<T> {
  private rawWorkItems: WorkItem[];

  public constructor(
    changeBundleInstalls: ChangeBundleInstall[],
    workItems: WorkItem[],
    con: Connection,
    branch: string,
    flags: T
  ) {
    super(changeBundleInstalls, con, branch, flags);
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

/**
 * Service class used to print the operation summary of an validate-deploy
 *
 */
class ValidateDeploySummaryOutputService<T extends OutputFlags> extends DeploySummaryOutputService<T> {
  protected changeBundleInstalls: ChangeBundleInstall[];
  protected changeBundles: string[] = [];

  public constructor(changeBundleInstalls: ChangeBundleInstall[], con: Connection, branch: string, flags: T) {
    super(con, branch, flags);
    this.changeBundleInstalls = changeBundleInstalls;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async buildSummary(): Promise<void> {
    // We get the stage name and the org url
    const envId: string = this.changeBundleInstalls[this.changeBundleInstalls.length - 1].sf_devops__Environment__r.Id;
    const pipelineInfo: PipelineInfo = await getPipelineInfo(this.con, envId);
    this.environmentName = pipelineInfo.environmentName;

    const changeBundles: Set<string> = new Set();
    for (const changeBundleInstall of this.changeBundleInstalls) {
      const changeBundle = changeBundleInstall.sf_devops__Change_Bundle__r;
      changeBundles.add(changeBundle.sf_devops__Version_Name__c);
    }

    this.changeBundles = Array.from(changeBundles);
  }

  protected printSummary(): void {
    const bundlesLabel =
      this.changeBundles.length === 1 ? output.getMessage('output.bundle') : output.getMessage('output.bundles');

    console.log(
      output.getMessage('output.validate-deploy-summary', [
        bundlesLabel,
        this.changeBundles.join('; '),
        this.environmentName,
      ])
    );
  }

  // eslint-disable-next-line class-methods-use-this
  protected printConciseSummary(): void {
    console.log(output.getMessage('output.concise.validate-deploy-summary', [this.branch, this.environmentName]));
  }
}

/**
 * This method gets info from the Pipeline to write the summaries (soup, versioned, validate-deploy)
 *
 * @param con Conenction used to query
 * @param environmentId
 * @returns PipelineInfo
 */
export async function getPipelineInfo(con: Connection, environmentId: string): Promise<PipelineInfo> {
  const envQueryResp: EnvQueryResult = await selectPipelineStageByEnvironment(con, environmentId);

  const pipelineInfo: PipelineInfo = {
    stageName: envQueryResp.sf_devops__Pipeline_Stages__r.records[0].Name,
    environmentName: envQueryResp.Name,
  };

  return pipelineInfo;
}

// This type will be defined here as it is sepecific from this function
export type PipelineInfo = {
  stageName: string;
  environmentName: string;
};
