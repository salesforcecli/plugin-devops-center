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

import { Connection, Messages } from '@salesforce/core';
import { AorOutputFlags } from './aorOutputService';
import { DeploySummaryBuilder } from './deploySummaryBuilder';
import { OutputService } from './outputService';
import { ResumeOutputService, AbstractResumeOutputService } from './resumeOutputService';

/* eslint-disable @typescript-eslint/no-empty-interface, no-console */

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.output');

export type PromoteOutputFlags = {
  branch: string;
} & AorOutputFlags;

/**
 * Interface for output methods for promote (and only deploy) operations
 *
 * @author JuanStenghele-sf
 */
export type PromoteOutputService = {} & ResumeOutputService

/**
 * Abstract class that implements PromoteOutputService interface
 *
 * @author JuanStenghele-sf
 */
export abstract class AbstractPromoteOutputService
  extends AbstractResumeOutputService<PromoteOutputFlags>
  implements PromoteOutputService
{
  private summaryBuilder: DeploySummaryBuilder;

  public constructor(flags: PromoteOutputFlags, summaryBuilder: DeploySummaryBuilder, con: Connection) {
    super(flags, '');
    this.summaryBuilder = summaryBuilder;
    this.con = con;
  }

  public async printOpSummary(): Promise<void> {
    if (this.flags.async) {
      // If the async flag is used we print an specific message
      console.log(output.getMessage('output.async-run-info', [this.aorId, this.aorId]));
    } else {
      // We build a summary output service
      const deploySummaryOutputService: OutputService | undefined = await this.summaryBuilder.build(
        this.flags.branch,
        this.aorId,
        this.flags
      );
      if (deploySummaryOutputService === undefined) {
        return;
      }

      // We print the summary
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await deploySummaryOutputService.printOpSummary();
    }
  }
}
