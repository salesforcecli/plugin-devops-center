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

import { Connection, Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { activatePipeline, updatePipelineRecord, PipelineUpdateResult } from '../../../utils/activatePipeline.js';
import { fetchPipelineStages } from '../../../utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../../utils/types.js';
import { validateSalesforceId } from '../../../utils/soqlUtils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.update');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPipelineUpdate extends SfCommand<PipelineUpdateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'pipeline-id': Flags.salesforceId({
      summary: messages.getMessage('flags.pipeline-id.summary'),
      required: true,
      char: undefined,
    }),
    active: Flags.boolean({
      summary: messages.getMessage('flags.active.summary'),
      required: false,
      allowNo: true,
    }),
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      required: false,
      char: 'n',
    }),
  };

  private static async getPipelineState(
    connection: Connection,
    pipelineId: string
  ): Promise<{ IsActive: boolean; Name: string }> {
    validateSalesforceId(pipelineId, 'pipeline');
    const result = await connection.query<{ IsActive: boolean; Name: string }>(
      `SELECT IsActive, Name FROM DevopsPipeline WHERE Id = '${pipelineId}' LIMIT 1`
    );
    const record = result.records[0];
    if (!record) {
      throw new Error(`Pipeline ${pipelineId} not found.`);
    }
    return record;
  }

  public async run(): Promise<PipelineUpdateResult> {
    const { flags } = await this.parse(DevopsPipelineUpdate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];
    const activateFlag = flags.active;
    const newName = flags.name;

    if (activateFlag === undefined && newName === undefined) {
      this.error(messages.getMessage('error.NoFlags'));
    }

    let stages: PipelineStageRecord[] = [];
    try {
      stages = await fetchPipelineStages(connection, pipelineId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    const pipeline = await DevopsPipelineUpdate.getPipelineState(connection, pipelineId);

    if (activateFlag === true && pipeline.IsActive) {
      this.error(messages.getMessage('error.AlreadyActive', [pipelineId]));
    }
    if (activateFlag === false && !pipeline.IsActive) {
      this.error(messages.getMessage('error.AlreadyInactive', [pipelineId]));
    }
    if (activateFlag === true && stages.length === 0) {
      this.error(messages.getMessage('error.NoStages', [pipelineId]));
    }

    const result = await this.applyUpdates(connection, pipelineId, activateFlag, newName, stages.length);

    this.log(`  Pipeline ID: ${pipelineId}`);
    if (result.name !== undefined) this.log(`  Name:        ${result.name}`);
    if (result.status !== undefined) this.log(`  Status:      ${result.status}`);
    if (activateFlag === true) this.log(`  Stages:      ${result.stageCount ?? stages.length}`);

    return result;
  }

  private async applyUpdates(
    connection: Connection,
    pipelineId: string,
    activateFlag: boolean | undefined,
    newName: string | undefined,
    stageCount: number
  ): Promise<PipelineUpdateResult> {
    const result: PipelineUpdateResult = { success: true, pipelineId };

    // Activate via Connect API
    if (activateFlag === true) {
      const activateResult = await activatePipeline({ connection, pipelineId });
      result.status = activateResult.status;
      result.stageCount = stageCount;
      this.log('Successfully activated the pipeline.');
    }

    // Deactivate and/or rename via Record API
    const recordFields: { IsActive?: boolean; Name?: string } = {};
    if (activateFlag === false) recordFields.IsActive = false;
    if (newName !== undefined) recordFields.Name = newName;

    if (Object.keys(recordFields).length > 0) {
      await updatePipelineRecord(connection, pipelineId, recordFields);
      if (activateFlag === false) {
        result.status = 'Inactive';
        this.log('Successfully deactivated the pipeline.');
      }
      if (newName !== undefined) {
        result.name = newName;
        this.log(`Successfully renamed the pipeline to "${newName}".`);
      }
    }

    return result;
  }
}
