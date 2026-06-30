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
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { promoteStage, PromoteStageResult } from '../../../utils/promoteStage.js';
import { selectPipelineStagesByProject } from '../../../common/selectors/pipelineStageSelector.js';
import { getPipelineIdForProject } from '../../../utils/pipelineUtils.js';
import { requiredDoceOrgFlag, devopsCenterProjectName } from '../../../common/flags/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.work-item.promote');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export type PromoteWorkItemsResult = {
  status: string;
  message: string;
  promotedWorkitemIds: string[];
};

export default class DevopsWorkItemPromote extends SfCommand<PromoteWorkItemsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'devops-center-username': requiredDoceOrgFlag(),
    'devops-center-project-name': devopsCenterProjectName,
    'work-item-id': Flags.string({
      summary: messages.getMessage('flags.work-item-id.summary'),
      char: 'i',
      required: true,
      multiple: true,
    }),
    'target-stage-id': Flags.string({
      summary: messages.getMessage('flags.target-stage-id.summary'),
      char: 't',
      required: true,
    }),
  };

  public async run(): Promise<PromoteWorkItemsResult> {
    const { flags } = await this.parse(DevopsWorkItemPromote);
    const org = flags['devops-center-username'];
    const connection = org.getConnection();
    const projectName = flags['devops-center-project-name'];
    const workItemIds = flags['work-item-id'];
    const targetStageId = flags['target-stage-id'];

    const pipelineId = await this.resolvePipelineId(connection, projectName);

    let apiResult: PromoteStageResult;
    try {
      apiResult = await promoteStage({
        connection,
        pipelineId,
        workItemIds,
        targetStageId,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      this.error(messages.getMessage('error.PromoteFailed', [errMsg]));
    }

    const result: PromoteWorkItemsResult = {
      status: apiResult.status || 'Completed',
      message: apiResult.message || 'Work items successfully promoted.',
      promotedWorkitemIds: workItemIds,
    };

    this.printOutput(result);

    return result;
  }

  private async resolvePipelineId(
    connection: Parameters<typeof selectPipelineStagesByProject>[0],
    projectName: string
  ): Promise<string> {
    try {
      const stages = await selectPipelineStagesByProject(connection, projectName);
      if (stages.length === 0) {
        this.error(commonErrorMessages.getMessage('error.ProjectNotFound', [projectName]));
      }
      const projectId = stages[0].sf_devops__Pipeline__r.sf_devops__Project__c;
      const pipelineId = await getPipelineIdForProject(connection, projectId);
      if (!pipelineId) {
        this.error(`No pipeline found for project "${projectName}". Ensure the project has an associated pipeline.`);
      }
      return pipelineId;
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'Query-failedError') {
        this.error(commonErrorMessages.getMessage('error.DevopsAppNotInstalled'));
      }
      if (err.name === 'No-results-foundError') {
        this.error(commonErrorMessages.getMessage('error.ProjectNotFound', [projectName]));
      }
      throw error;
    }
  }

  private printOutput(result: PromoteWorkItemsResult): void {
    this.log(`Status: ${result.status}`);
    this.log(`Message: ${result.message}`);
    this.log('');
    this.log('Promoted Work Items');
    this.log('───────────────────');
    for (const id of result.promotedWorkitemIds) {
      this.log(id);
    }
  }
}
