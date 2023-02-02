/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { PromoteCommand } from '../../common/abstractPromote';
import { PipelineStage, PromotePipelineResult } from '../../common';

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

  public async run(): Promise<PromotePipelineResult> {
    return this.executePromotion();
  }

  /**
   * Computes the source stage Id for deployOnly promotions. If the given stage has a previous stage
   * then the source stage is the previous stage. If not the it means this is the
   * first stage of the pipeline and source stage Id = Approved.
   */
  protected computeSourceStageId(pipelineStage: PipelineStage): void {
    this.sourceStageId = pipelineStage?.sf_devops__Pipeline_Stages__r
      ? pipelineStage.sf_devops__Pipeline_Stages__r.records[0].Id
      : 'Approved';
  }

  /**
   * Adds a promote option so it performs an undeployed only promotion
   */
  protected addPromoteOptions(): void {
    this.deployOptions = { ...this.deployOptions, undeployedOnly: true };
  }
}
