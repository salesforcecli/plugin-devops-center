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
import { PromoteCommand } from '../../../common/base/abstractPromote.js';
import type { PipelineStage, PromoteOptions } from '../../../common/index.js';
import { APPROVED } from '../../../common/constants.js';
import type { AsyncOperationResultJson } from '../../../common/types.js';
import { promoteStage } from '../../../utils/promoteStage.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.stage.promote');

export default class DevopsStagePromote extends PromoteCommand<typeof SfCommand> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  protected baseCommand = 'devops stage promote';
  private readonly isUndeployedOnly = true;

  public async run(): Promise<AsyncOperationResultJson> {
    return this.executePromotion();
  }

  protected getSourceStageId(): string {
    const targetStage: PipelineStage = this.getTargetStage();
    return targetStage.sf_devops__Pipeline_Stages__r
      ? targetStage.sf_devops__Pipeline_Stages__r.records[0].Id
      : APPROVED;
  }

  protected getPromoteOptions(): Partial<PromoteOptions> {
    return { undeployedOnly: this.isUndeployedOnly };
  }

  /**
   * Override the promotion request to use the Connect API endpoint
   * instead of the legacy Apex REST endpoint.
   */
  protected async requestPromotionFlow(): Promise<string> {
    const targetStage = this.getTargetStage();
    const pipelineId = targetStage.sf_devops__Pipeline__r.sf_devops__Project__c;
    const connection = this.targetOrg.getConnection();

    const sourceStageId = this.getSourceStageId();

    const workItemIds = await this.fetchWorkItemIdsForStage(connection, sourceStageId);
    if (workItemIds.length === 0) {
      this.error(messages.getMessage('error.NoWorkItems'));
    }

    const result = await promoteStage({
      connection,
      pipelineId,
      workItemIds,
      targetStageId: targetStage.Id,
    });

    return result.jobId;
  }

  private async fetchWorkItemIdsForStage(
    connection: Parameters<typeof promoteStage>[0]['connection'],
    stageId: string
  ): Promise<string[]> {
    if (stageId === APPROVED) {
      const targetStage = this.getTargetStage();
      const projectId = targetStage.sf_devops__Pipeline__r.sf_devops__Project__c;
      const result = await connection.query<{ Id: string }>(
        `SELECT Id FROM WorkItem WHERE DevopsProjectId = '${projectId}' AND Status = 'Approved'`
      );
      return (result.records ?? []).map((r) => r.Id);
    }

    const result = await connection.query<{ Id: string }>(
      `SELECT Id FROM WorkItem WHERE DevopsPipelineStageId = '${stageId}'`
    );
    return (result.records ?? []).map((r) => r.Id);
  }
}
