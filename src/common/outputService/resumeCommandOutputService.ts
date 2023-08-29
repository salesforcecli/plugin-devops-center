/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, @typescript-eslint/require-await */

import { Connection, Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags } from '../base/abstractResume';
import { AorOutputFlags } from './aorOutputService';
import { AbstractResumeOutputService } from './resumeOutputService';

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'resume.output');

/**
 * Service class to print the resume output
 *
 * @author JuanStenghele-sf
 */
export class ResumeCommandOutputService extends AbstractResumeOutputService<AorOutputFlags> {
  private operationType: string;

  public constructor(flags: Flags<typeof SfCommand>, operationType: string, con: Connection) {
    super(
      {
        concise: flags['concise'],
        verbose: flags['verbose'],
      },
      ''
    );
    this.con = con;
    this.operationType = operationType;
  }

  public printOpSummary(): void {
    console.log(output.getMessage('output.summary', [this.operationType]));
  }
}
