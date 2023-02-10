/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { PromoteCommand } from '../../common/abstractPromote';
import { PipelineStage, PromoteOptions, PromotePipelineResult } from '../../common';
import { APPROVED } from '../../common/constants';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.pipeline');

/**
 * Contains the logic to execute the sf deploy pipeline command.
 */
export default class DeployPipeline extends PromoteCommand<typeof SfCommand> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';
  private readonly isUndeployedOnly = true;

  public async run(): Promise<PromotePipelineResult> {
    return this.executePromotion();
  }

  /**
   * Computes the source stage Id for deployOnly promotions. If the given stage has a previous stage
   * then the source stage is the previous stage. If not the it means this is the
   * first stage of the pipeline and source stage Id = Approved.
   *
   * @returns: string. It is the source stage Id.
   */
  protected getSourceStageId(): string {
    const targetStage: PipelineStage = this.getTargetStage();
    return targetStage.sf_devops__Pipeline_Stages__r
      ? targetStage.sf_devops__Pipeline_Stages__r.records[0].Id
      : APPROVED;
  }

  /**
   * Returns the promote option necessary to performs an undeployed only promotion
   */
  protected getPromoteOptions(): Partial<PromoteOptions> {
    return { undeployedOnly: this.isUndeployedOnly };
  }

  /**
   * Default function for catching commands errors.
   *
   * @param error
   * @returns
   */
  protected catch(error: Error | SfError): Promise<SfCommand.Error> {
    if (error.name.includes('GenericTimeoutError')) {
      const err = messages.createError('error.ClientTimeout');
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }
}
