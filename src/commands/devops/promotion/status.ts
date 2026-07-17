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

import { Messages, Org } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { getPromotionStatus, PromotionStatusResult } from '../../../utils/getPromotionStatus.js';
import { colorStatus } from '../../../common/outputService/outputUtils.js';
import { AsyncOperationStatus } from '../../../common/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.promotion.status');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPromotionStatus extends SfCommand<PromotionStatusResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'request-token': Flags.string({
      summary: messages.getMessage('flags.request-token.summary'),
      required: true,
      char: 'i',
    }),
  };

  public async run(): Promise<PromotionStatusResult> {
    const { flags } = await this.parse(DevopsPromotionStatus);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const requestToken = flags['request-token'];

    let result: PromotionStatusResult;
    try {
      result = await getPromotionStatus(connection, requestToken);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      if (errMsg.startsWith('RequestNotFound:') || errMsg.includes('entity is deleted')) {
        this.error(messages.getMessage('error.RequestNotFound', [requestToken]));
      }
      throw error;
    }

    const statusStr = Object.values(AsyncOperationStatus).includes(result.status as AsyncOperationStatus)
      ? colorStatus(result.status as AsyncOperationStatus)
      : result.status;

    this.log(`  Request Token:      ${result.requestToken}`);
    this.log(`  ID:                 ${result.id}`);
    this.log(`  Status:             ${statusStr}`);
    if (result.message) this.log(`  Message:            ${result.message}`);
    if (result.errorDetails) this.log(`  Error Details:      ${result.errorDetails}`);
    if (result.requestCompletionDate) this.log(`  Completion Date:    ${result.requestCompletionDate}`);

    return result;
  }
}
