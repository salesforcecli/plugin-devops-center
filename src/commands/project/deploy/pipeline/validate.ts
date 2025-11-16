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
import { PromoteOptions } from '../../../../common';
import { AsyncOperationResultJson } from '../../../../common/types';
import DeployPipeline from './start';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'project.deploy.pipeline.validate');

/**
 * Contains the logic to execute the sf project deploy pipeline validate command.
 */
export default class ValidateDeployPipeline extends DeployPipeline {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';
  protected baseCommand = 'project deploy pipeline';
  private readonly isCheckDeploy = true;

  public async run(): Promise<AsyncOperationResultJson> {
    return this.executePromotion();
  }

  /**
   * Returns the promote option necessary to perform a validate deploy
   */
  protected getPromoteOptions(): Partial<PromoteOptions> {
    return { ...super.getPromoteOptions(), checkDeploy: this.isCheckDeploy };
  }
}
