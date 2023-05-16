/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { AsyncOperationResultJson } from '../../../../common';
import { ResumeCommand } from '../../../../common/base/abstractResume';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'project.deploy.pipeline.resume');

export default class DeployPipelineResume extends ResumeCommand<typeof SfCommand> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';

  protected operationType = 'Deployment';
  protected baseCommand = 'project deploy pipeline';

  public async run(): Promise<AsyncOperationResultJson> {
    return this.resumeOperation();
  }
}
