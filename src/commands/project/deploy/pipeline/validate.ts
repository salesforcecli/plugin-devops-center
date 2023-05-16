/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
