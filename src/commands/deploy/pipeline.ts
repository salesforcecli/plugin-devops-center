/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { PromotePipelineResult, validateTestFlags } from '../../common';
import { DeployPipelineCache } from '../../common/deployPipelineCache';
import {
  branchName,
  bundleVersionName,
  deployAll,
  devopsCenterProjectName,
  requiredDoceOrgFlag,
  specificTests,
  testLevel,
  async,
} from '../../common/flags';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.pipeline');

/**
 * Contains the logic to execute the sf deploy pipeline command.
 */
export default class DeployPipeline extends SfCommand<PromotePipelineResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';

  public static readonly flags = {
    'branch-name': branchName,
    'bundle-version-name': bundleVersionName,
    'deploy-all': deployAll,
    'devops-center-project-name': devopsCenterProjectName,
    'devops-center-username': requiredDoceOrgFlag(),
    tests: specificTests,
    'test-level': testLevel(),
    async,
  };

  public async run(): Promise<PromotePipelineResult> {
    const { flags } = await this.parse(DeployPipeline);
    validateTestFlags(flags['test-level'], flags.tests);

    // TODO Timeout case
    if (flags.async) {
      // TODO Get the aorId
      const aorId = 'TODO';
      await DeployPipelineCache.set(aorId, {});
    }

    // hardcoded value so it compiles until main logic is implemented
    return { status: 'status' };
  }
}
