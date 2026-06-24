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
import { createPipeline, CreatePipelineResult, detectRepoType } from '../../../utils/createPipeline.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'devops.pipeline.create');
const commonErrorMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export default class DevopsPipelineCreate extends SfCommand<CreatePipelineResult> {
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
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
      required: true,
    }),
    repo: Flags.string({
      summary: messages.getMessage('flags.repo.summary'),
      char: 'r',
      required: true,
    }),
    'repo-type': Flags.string({
      summary: messages.getMessage('flags.repo-type.summary'),
      options: ['github', 'bitbucket'],
    }),
    'create-repo': Flags.boolean({
      summary: messages.getMessage('flags.create-repo.summary'),
      default: false,
    }),
    'repo-owner': Flags.string({
      summary: messages.getMessage('flags.repo-owner.summary'),
    }),
    'bitbucket-project': Flags.string({
      summary: messages.getMessage('flags.bitbucket-project.summary'),
    }),
    description: Flags.string({
      summary: messages.getMessage('flags.description.summary'),
      char: 'd',
    }),
  };

  public async run(): Promise<CreatePipelineResult> {
    const { flags } = await this.parse(DevopsPipelineCreate);
    const org: Org = flags['target-org'];
    const connection = org.getConnection(flags['api-version']);
    const repoType = this.resolveRepoType(flags['repo-type'], flags['repo'], flags['create-repo']);

    if (flags['create-repo'] && !flags['repo-owner']) {
      this.error(messages.getMessage('error.RepoOwnerRequired'));
    }

    let result: CreatePipelineResult;
    try {
      result = await createPipeline({
        connection,
        name: flags['name'],
        description: flags['description'],
        repo: flags['repo'],
        repoType,
        createRepo: flags['create-repo'],
        repoOwner: flags['repo-owner'],
        bitbucketProject: flags['bitbucket-project'],
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('sObject type') && errMsg.includes('is not supported')) {
        this.error(commonErrorMessages.getMessage('error.DevopsCenterNotEnabled'));
      }
      this.handleApiError(errMsg, flags['repo']);
      throw error;
    }

    if (result.success) {
      this.printSuccessOutput(result, flags['repo'], org.getUsername());
    } else {
      this.error(`Failed to create pipeline: ${result.error ?? ''}`);
    }

    return result;
  }

  private resolveRepoType(flagRepoType: string | undefined, repo: string, isCreateRepo: boolean): string {
    if (isCreateRepo && !flagRepoType) {
      this.error(messages.getMessage('error.RepoTypeRequired'));
    }
    if (flagRepoType) return flagRepoType;

    const detected = detectRepoType(repo);
    if (!detected) {
      this.error(messages.getMessage('error.RepoTypeDetectionFailed', [repo]));
    }
    return detected;
  }

  private handleApiError(errMsg: string, repo: string): void {
    if (errMsg.includes('REPOSITORY_CREATION_FAILED')) {
      this.error(messages.getMessage('error.RepoCreationFailed', [repo, errMsg]));
    }
    if (errMsg.includes('REPO_NOT_FOUND_OR_UNAUTHORIZED')) {
      this.error(messages.getMessage('error.RepoNotFound', [repo]));
    }
    if (errMsg.includes('SOURCE_CODE_SERVICE_ERROR')) {
      this.error(messages.getMessage('error.RepoValidationFailed', [repo]));
    }
    if (errMsg.includes('BITBUCKET_API_ERROR') && errMsg.includes('ProviderInfo is missing')) {
      this.error(messages.getMessage('error.VcsCredentialsMissing', [repo]));
    }
  }

  private printSuccessOutput(result: CreatePipelineResult, repoFlag: string, username: string | undefined): void {
    if (result.repository?.created) {
      this.log(`Created repository: ${repoFlag} (${result.repository.repoType})`);
    }
    this.log(`Successfully created pipeline: ${result.name ?? ''}`);
    this.log(`  Pipeline ID: ${result.pipelineId ?? ''}`);
    this.log(`  Repository:  ${result.repository?.repoUrl ?? ''} (${result.repository?.repoType ?? ''})`);
    this.log(`  Status:      ${result.status ?? 'Inactive'}`);
    this.log('  Next steps:');
    const orgLabel = username ?? '<org>';
    const pipelineIdLabel = result.pipelineId ?? '<ID>';
    this.log(
      `    Add pipeline stages: sf devops pipeline stage add --target-org ${orgLabel} --pipeline-id ${pipelineIdLabel}`
    );
    this.log(
      `    Attach a project: sf devops pipeline attach-project --target-org ${orgLabel} --pipeline-id ${pipelineIdLabel} --project-id <ID>`
    );
  }
}
