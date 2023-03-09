/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Messages } from '@salesforce/core';
import { DeployComponentsTable } from '../outputColumns';
import { DeployComponent } from '../types';
import { getFormattedDeployComponentsByAyncOpId } from '../utils';
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
export interface PromoteOutputService extends ResumeOutputService {
  displayEndResults(): Promise<void>;
}

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
  private con: Connection;

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

  /**
   * This method will print a table of the deployed components for the current AOR
   */
  public async displayEndResults(): Promise<void> {
    const components: DeployComponent[] = await getFormattedDeployComponentsByAyncOpId(this.con, this.aorId);
    this.displayTable(components, DeployComponentsTable.title, DeployComponentsTable.columns);
  }
}
