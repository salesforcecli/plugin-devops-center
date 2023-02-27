/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable class-methods-use-this */

import { Connection } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import * as Promote from '../abstractPromote';
import { DeployCommandOutputService } from './deployCommandOutputService';
import { DeploySummaryBuilder } from './deploySummaryBuilder';
import { ResumeCommandOutputService } from './resumeCommandOutputService';

/**
 * Factory service for creating output services
 *
 * @author JuanStenghele-sf
 */
export class OutputServiceFactory {
  /**
   * Create a service to print the deployment info.
   */
  public forDeployment(flags: Promote.Flags<typeof SfCommand>, con: Connection): DeployCommandOutputService {
    return new DeployCommandOutputService(flags, new DeploySummaryBuilder(con));
  }

  /**
   * Create a service to print the resume info.
   */
  public forResume(operationType: string): ResumeCommandOutputService {
    return new ResumeCommandOutputService(operationType);
  }
}
