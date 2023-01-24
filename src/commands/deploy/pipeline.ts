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
import { DeployPipelineCache } from '../../common/deployPipelineCache';

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
    // TODO Timeout case
    if (this.flags.async) {
      // TODO Get the aorId
      const aorId = 'TODO';
      await DeployPipelineCache.set(aorId, {});
    }
    return this.executePromotion();
  }

  /**
   * Computes the target stage Id for deployOnly promotions. If the given stage has a previous stage
   * then the target stage is the previous stage. If not the it means this is the
   * first stage of the pipeline and target stage Id = Approved.
   */
  protected computeTargetStageId(pipelineStage: PipelineStage): void {
    this.targetStageId = pipelineStage?.sf_devops__Pipeline_Stages__r
      ? pipelineStage.sf_devops__Pipeline_Stages__r.records[0].Id
      : 'Approved';
  }
}
