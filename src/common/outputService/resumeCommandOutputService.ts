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
