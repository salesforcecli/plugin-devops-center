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
import {
  createPullRequest,
  CreatePullRequestResult,
  fetchWorkItemDetail,
  resolveGitHubToken,
  WorkItemDetail,
} from '../../../utils/createPullRequest.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pull-request.create');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPullRequestCreate extends SfCommand<CreatePullRequestResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      char: 'o',
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
    'api-version': Flags.orgApiVersion(),
    'work-item-name': Flags.string({
      summary: messages.getMessage('flags.work-item-name.summary'),
      char: 'n',
      exactlyOne: ['work-item-name', 'work-item-id'],
    }),
    'work-item-id': Flags.salesforceId({
      summary: messages.getMessage('flags.work-item-id.summary'),
      char: 'w',
      exactlyOne: ['work-item-name', 'work-item-id'],
    }),
    title: Flags.string({
      summary: messages.getMessage('flags.title.summary'),
    }),
    body: Flags.string({
      summary: messages.getMessage('flags.body.summary'),
    }),
  };

  public async run(): Promise<CreatePullRequestResult> {
    const { flags } = await this.parse(DevopsPullRequestCreate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);

    const filter = flags['work-item-name'] ? { name: flags['work-item-name'] } : { id: flags['work-item-id']! };

    let detail: WorkItemDetail;
    try {
      detail = await fetchWorkItemDetail(connection, filter);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      throw error;
    }

    if (!detail.branchName) {
      this.error(messages.getMessage('error.NoBranch', [detail.workItemName]));
    }
    if (!detail.repoOwner || !detail.repoName) {
      this.error(messages.getMessage('error.NoRepo', [detail.workItemName]));
    }
    if (!detail.targetBranch) {
      this.error(messages.getMessage('error.NoTargetBranch', [detail.workItemName]));
    }
    if (!detail.provider) {
      this.error(messages.getMessage('error.NoProvider', [detail.workItemName]));
    }

    let token: string | undefined;
    if (detail.provider === 'github') {
      token = await resolveGitHubToken();
    } else {
      token = process.env.BITBUCKET_TOKEN;
    }
    if (!token) {
      this.error(messages.getMessage('error.NoToken', [detail.provider]));
    }

    const prTitle = flags['title'] ?? detail.subject;

    const result = await createPullRequest({
      owner: detail.repoOwner,
      repo: detail.repoName,
      head: detail.branchName,
      base: detail.targetBranch,
      title: prTitle,
      body: flags['body'],
      provider: detail.provider,
      token,
    });

    if (result.success) {
      this.log(`Successfully created pull request for ${detail.workItemName}.`);
      this.log(`  Title: ${result.title ?? prTitle}`);
      this.log(`  URL: ${result.url ?? ''}`);
      this.log(`  Source: ${detail.workItemName} → ${result.targetBranch ?? detail.targetBranch}`);
    }

    return result;
  }
}
