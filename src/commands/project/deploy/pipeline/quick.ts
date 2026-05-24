/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
