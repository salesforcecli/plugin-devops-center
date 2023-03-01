/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, @typescript-eslint/require-await */

import { Messages } from '@salesforce/core';
import { AbstractAorOutputService, AorOutputFlags } from './aorOutputService';
import { ResumeOutputService } from './resumeOutputService';

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'resume.output');

/**
 * Service class to print the resume output
 *
 * @author JuanStenghele-sf
 */
export class ResumeCommandOutputService
  extends AbstractAorOutputService<AorOutputFlags>
  implements ResumeOutputService
{
  private operationType: string;

  public constructor(operationType: string) {
    super({}, '');
    this.operationType = operationType;
  }

  public printOpSummary(): void {
    console.log(output.getMessage('output.summary', [this.operationType]));
  }
}
