/*
 * Copyright 2025, Salesforce, Inc.
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
import { PromoteCommand } from '../../../../common/base/abstractPromote';
import { PipelineStage, PromoteOptions } from '../../../../common';
import { APPROVED } from '../../../../common/constants';
import { AsyncOperationResultJson } from '../../../../common/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'project.deploy.pipeline.start');

/**
 * Contains the logic to execute the sf project deploy pipeline start command.
 */
export default class DeployPipeline extends PromoteCommand<typeof SfCommand> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';
  protected baseCommand = 'project deploy pipeline';
  private readonly isUndeployedOnly = true;

  public async run(): Promise<AsyncOperationResultJson> {
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
}
