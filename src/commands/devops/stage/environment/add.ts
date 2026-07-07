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

import { exec } from 'node:child_process';
import { Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { addStageEnvironment, AddStageEnvironmentResult, OrgType } from '../../../../utils/addStageEnvironment.js';
import { fetchPipelineStages } from '../../../../utils/pipelineUtils.js';
import { PipelineStageRecord } from '../../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.stage.environment.add');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

function openUrl(url: string): void {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

function decodeRedirectUrl(url: string): string {
  return url.replace(/&amp;/g, '&');
}

export default class DevopsStageEnvironmentAdd extends SfCommand<AddStageEnvironmentResult> {
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
    'stage-id': Flags.salesforceId({
      summary: messages.getMessage('flags.stage-id.summary'),
      required: true,
      char: undefined,
    }),
    'environment-name': Flags.string({
      summary: messages.getMessage('flags.environment-name.summary'),
      required: true,
      char: 'e',
    }),
    'org-type': Flags.string({
      summary: messages.getMessage('flags.org-type.summary'),
      required: true,
      options: ['Production', 'Sandbox'],
    }),
    'no-browser': Flags.boolean({
      summary: messages.getMessage('flags.no-browser.summary'),
      default: false,
    }),
  };

  public async run(): Promise<AddStageEnvironmentResult> {
    const { flags } = await this.parse(DevopsStageEnvironmentAdd);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const pipelineId = flags['pipeline-id'];
    const stageId = flags['stage-id'];
    const environmentName = flags['environment-name'];
    const orgType = flags['org-type'] as OrgType;
    const noBrowser = flags['no-browser'];

    let stages: PipelineStageRecord[];
    try {
      stages = await fetchPipelineStages(connection, pipelineId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (!stages.some((s) => s.Id === stageId)) {
      this.error(messages.getMessage('error.StageNotFound', [stageId, pipelineId]));
    }

    const pipelineQueryResult = await connection.query(
      `SELECT IsActive FROM DevopsPipeline WHERE Id = '${pipelineId}' LIMIT 1`
    );
    const pipelineRecord = (pipelineQueryResult.records ?? [])[0] as { IsActive?: boolean } | undefined;
    if (pipelineRecord?.IsActive) {
      this.error(messages.getMessage('error.PipelineAlreadyActive', [pipelineId]));
    }

    let result: AddStageEnvironmentResult;
    try {
      result = await addStageEnvironment({
        connection,
        pipelineId,
        stageId,
        environmentName,
        orgType,
        onCreated: (data) => {
          const url = decodeRedirectUrl(data.redirectUrl);
          if (!noBrowser) {
            openUrl(url);
            this.log(messages.getMessage('info.BrowserOpened'));
          } else {
            this.log(messages.getMessage('info.ManualAuth', [url]));
          }
          this.spinner.start(messages.getMessage('info.WaitingForAuth'));
        },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      if (errMsg.includes('timed out')) {
        this.error(messages.getMessage('error.AuthTimeout'));
      }
      throw error;
    } finally {
      this.spinner.stop();
    }

    if (result.success) {
      this.log(messages.getMessage('info.Success'));
      this.log(`  Stage ID:         ${stageId}`);
      this.log(`  Environment ID:   ${result.environmentId ?? ''}`);
      this.log(`  Environment Name: ${result.environmentName ?? ''}`);
      this.log(`  Org Type:         ${orgType}`);
      this.log(`  Pipeline ID:      ${pipelineId}`);
      this.log(`  Organization ID:  ${result.organizationId ?? ''}`);
    } else {
      this.error(messages.getMessage('error.EnvironmentAttachFailed', [result.error ?? '']));
    }

    return result;
  }
}
