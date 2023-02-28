/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
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
export interface PromoteOutputService extends ResumeOutputService {}

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

  public constructor(flags: PromoteOutputFlags, summaryBuilder: DeploySummaryBuilder) {
    super(flags, '');
    this.summaryBuilder = summaryBuilder;
  }

  public async printOpSummary(): Promise<void> {
    if (this.flags.async) {
      // If the async flag is used we print an specific message
      console.log(output.getMessage('output.async-run-info', [this.aorId, this.aorId]));
    } else {
      // We build a summary output service
      const deploySummaryOutputService: OutputService | undefined = await this.summaryBuilder.build(
        this.flags.branch,
        this.aorId
      );
      if (deploySummaryOutputService === undefined) {
        return;
      }

      // We print the summary
      await deploySummaryOutputService.printOpSummary();
    }
  }
}
