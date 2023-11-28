/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Interfaces } from '@oclif/core';
import { Messages, Org } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { HttpRequest } from 'jsforce';
import { ApiPromoteResponse, AsyncOperationStatus, PipelineStage, PromoteOptions } from '..';
import { REST_PROMOTE_BASE_URL } from '../constants';
import { DeployPipelineCache } from '../deployPipelineCache';
import { async } from '../flags/promote/promoteFlags';
import { concise, requiredDoceOrgFlag, verbose, wait } from '../flags/flags';
import { OutputServiceFactory } from '../outputService';
import { AsyncOperationResultJson } from '../../common';
import {
  CheckDeploymentResultWithChangeBundleInstalls,
  selectOneDeploymentResultWithChangeBundleInstallsByAsyncJobId,
} from '../selectors/deploymentResultsSelector';
import { selectOnePipelineStageByEnvironmentId } from '../selectors/pipelineStageSelector';
import { AsyncCommand } from './abstractAsyncOperation';

export type Flags<T extends typeof SfCommand> = Interfaces.InferredFlags<
  (typeof QuickPromotionCommand)['baseFlags'] & T['flags']
>;

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'project.deploy.pipeline.quick');

export default abstract class QuickPromotionCommand<T extends typeof SfCommand> extends AsyncCommand {
  public static baseFlags = {
    async,
    concise,
    verbose,
    wait,
    'devops-center-username': requiredDoceOrgFlag(),
    'job-id': Flags.salesforceId({
      char: 'i',
      description: messages.getMessage('flags.job-id.description'),
      summary: messages.getMessage('flags.job-id.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    'use-most-recent': Flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.use-most-recent.description'),
      summary: messages.getMessage('flags.use-most-recent.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
  };

  protected flags!: Flags<T>;
  private targetStage: PipelineStage;
  private deployOptions: Partial<PromoteOptions>;

  public async init(): Promise<void> {
    await super.init();
    const { flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof QuickPromotionCommand).baseFlags,
    });
    this.flags = flags as Flags<T>;
    this.targetOrg = this.flags['devops-center-username'] as Org;
  }

  /**
   *
   * Knows how to perform a quick promotion and watch its progress.
   */
  public async executeQuickPromotion(): Promise<AsyncOperationResultJson> {
    const deploymentResult = await this.getDeploymentResultForQuickDeploy();
    const envId = deploymentResult.sf_devops__Change_Bundle_Installs__r.records[0].sf_devops__Environment__c;
    this.targetStage = (await selectOnePipelineStageByEnvironmentId(
      this.targetOrg.getConnection(),
      envId
    )) as PipelineStage;

    this.setOutputService(
      new OutputServiceFactory().forQuickDeployment(
        this.flags,
        (this.flags['devops-center-username'] as Org).getConnection(),
        this.targetStage.sf_devops__Branch__r.sf_devops__Name__c
      )
    );

    this.setAsyncOperationId(
      await this.requestPromotion(
        this.targetStage.sf_devops__Pipeline__r.sf_devops__Project__c,
        this.getSourceStageId(),
        deploymentResult.sf_devops__Deployment_Id__c
      )
    );

    return this.monitorOperation(this.flags.async, this.flags.wait);
  }

  protected getTargetStage(): PipelineStage {
    return this.targetStage;
  }

  /**
   *
   * Build a promotion request for a quick promotion and send it to the target org.
   *
   * @param projectId ID of the project.
   * @param sourceStageId ID of the source stage.
   * @param deploymentId ID of the validate deployemnt to use for quick deploy.
   */
  private async requestPromotion(projectId: string, sourceStageId: string, deploymentId: string): Promise<string> {
    this.buildPromoteOptions(deploymentId);
    const req: HttpRequest = {
      method: 'POST',
      url: `${REST_PROMOTE_BASE_URL as string}${projectId}/pipelineName/${sourceStageId}`,
      body: JSON.stringify({
        promoteOptions: this.deployOptions,
      }),
    };
    const response: ApiPromoteResponse = await this.targetOrg.getConnection().request(req);
    return response.jobId;
  }

  /**
   *
   * Obtain the deployment ID to use for quick promotion.
   */
  private async getDeploymentResultForQuickDeploy(): Promise<CheckDeploymentResultWithChangeBundleInstalls> {
    const asyncJobId = this.flags['use-most-recent']
      ? (await DeployPipelineCache.create()).getLatestKeyOrThrow()
      : (this.flags['job-id'] as string);

    const deploymentResult = await selectOneDeploymentResultWithChangeBundleInstallsByAsyncJobId(
      this.targetOrg.getConnection(),
      asyncJobId
    );

    if (!deploymentResult) {
      throw messages.createError('error.JobIsNotValidationDeployment');
    }
    if (deploymentResult.sf_devops__Check_Deploy_Status__r.sf_devops__Status__c !== AsyncOperationStatus.Completed) {
      throw messages.createError('error.JobIsNotValidated');
    }
    return deploymentResult;
  }

  /**
   *
   * Build the promote options for a quick promotion.
   */
  private buildPromoteOptions(deployId: string): void {
    this.deployOptions = {
      deploymentId: deployId,
      // get more promote options from the concrete implementation if needed
      ...this.getPromoteOptions(),
    };
  }

  /**
   * Knows how to compute the target pipeline stage Id based on the type of promotion.
   *
   * @returns: string. It is the source stage Id.
   */
  protected abstract getSourceStageId(): string;

  /**
   * Returns the specific promote options specific for every concrete implementations.
   *
   * @returns: Partial<PromoteOptions>.
   */
  protected abstract getPromoteOptions(): Partial<PromoteOptions>;
}
