/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, class-methods-use-this , no-case-declarations */

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
  public constructor(flags: Flags<typeof SfCommand>, summaryBuilder: DeploySummaryBuilder) {
    super(
      {
        async: flags['async'],
        branch: flags['branch-name'],
      },
      summaryBuilder
    );
  }
}
