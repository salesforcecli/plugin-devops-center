/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import QuickPromotionCommand from '../../../../common/base/abstractQuick';
import { AsyncOperationResultJson, PromoteOptions } from '../../../../common';
import { PreviousPipelineStages } from '../../../../common/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'project.deploy.pipeline.quick');

export default class DeployPipelineQuick extends QuickPromotionCommand<typeof SfCommand> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';

  protected baseCommand = 'project deploy pipeline';
  private readonly isUndeployedOnly = true;

  public async run(): Promise<AsyncOperationResultJson> {
    return this.executeQuickPromotion();
  }

  /**
   * Computes the source stage Id for quick promotions. Quick promotions are allowed only
   * in versioned promotions so source stage is previous stage.
   *
   * @returns: string. It is the source stage Id.
   */
  protected getSourceStageId(): string {
    // for versioned promotions we always have a previous stage
    const prevStages = this.getTargetStage().sf_devops__Pipeline_Stages__r as PreviousPipelineStages;
    return prevStages.records[0].Id;
  }

  /**
   * Returns the promote option necessary to performs an undeployed only promotion.
   */
  protected getPromoteOptions(): Partial<PromoteOptions> {
    return { undeployedOnly: this.isUndeployedOnly };
  }
}
