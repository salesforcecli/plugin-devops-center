/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, class-methods-use-this , no-case-declarations */

import { Connection } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags } from '../base/abstractPromote';
import { DeploySummaryBuilder } from './deploySummaryBuilder';
import { AbstractPromoteOutputService } from './promoteOutputService';

/**
 * Service class to print the deploy output
 *
 * @author JuanStenghele-sf
 */
export class DeployCommandOutputService extends AbstractPromoteOutputService {
  public constructor(flags: Partial<Flags<typeof SfCommand>>, con: Connection, branchName?: string) {
    super(
      {
        async: flags['async'],
        branch: branchName ? branchName : (flags['branch-name'] as string),
        concise: flags['concise'],
        verbose: flags['verbose'],
      },
      new DeploySummaryBuilder(con),
      con
    );
  }
}
