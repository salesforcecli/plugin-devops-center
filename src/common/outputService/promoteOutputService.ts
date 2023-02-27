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
import { AbstractResumeOutputService, ResumeOutputService } from './resumeOutputService';

/* eslint-disable @typescript-eslint/no-empty-interface, no-console */

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.output');

export type PromoteOutputFlags = {
  branch: string;
} & AorOutputFlags;

/**
 * Interface for output methods for deploy operations
 *
 * @author JuanStenghele-sf
 */
export interface PromoteOutputService extends ResumeOutputService {}

/**
 * Interface for output methods for deploy operations
 *
 * @author JuanStenghele-sf
 */
export abstract class AbstractPromoteOutputService
  extends AbstractResumeOutputService<PromoteOutputFlags>
  implements PromoteOutputService
{
  private summaryBuilder: DeploySummaryBuilder;

  public constructor(flags: Partial<PromoteOutputFlags>, summaryBuilder: DeploySummaryBuilder) {
    super(flags, '');
    this.summaryBuilder = summaryBuilder;
  }

  /**
   * Given an aorId prints the deployment wanted to be done summary
   * We also receive the branch as it is a command's param
   */
  public async printOpSummary(): Promise<void> {
    if (this.flags.async) {
      console.log(output.getMessage('output.async-run-info', [this.aorId, this.aorId]));
    } else {
      if (this.flags.branch === undefined) {
        return;
      }

      const deploySummaryOutputService: OutputService | undefined = await this.summaryBuilder.build(
        this.aorId,
        this.flags.branch
      );
      if (deploySummaryOutputService === undefined) {
        return;
      }

      await deploySummaryOutputService.printOpSummary();
    }
  }
}
