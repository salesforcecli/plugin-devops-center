/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable class-methods-use-this */

import { Connection } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags as PromoteFlags } from '../base/abstractPromote';
import { Flags as ReportFlags } from '../base/abstractReportOnPromote';
import { Flags as ResumeFlags } from '../base/abstractResume';
import { Flags as QuickPromoteFlags } from '../base/abstractQuick';
import { DeploymentResult } from '../types';
import { DeployCommandOutputService } from './deployCommandOutputService';
import { PromoteReportOutputService } from './reportOutputService';
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
  public forDeployment(flags: Partial<PromoteFlags<typeof SfCommand>>, con: Connection): DeployCommandOutputService {
    return new DeployCommandOutputService(flags, con);
  }

  /**
   * Create a service to print the quick deployment info.
   */
  public forQuickDeployment(
    flags: Partial<QuickPromoteFlags<typeof SfCommand>>,
    con: Connection,
    branchName: string
  ): DeployCommandOutputService {
    return new DeployCommandOutputService(flags, con, branchName);
  }

  /**
   * Create a service to print the resume info.
   */
  public forResume(
    flags: ResumeFlags<typeof SfCommand>,
    operationType: string,
    con: Connection
  ): ResumeCommandOutputService {
    return new ResumeCommandOutputService(flags, operationType, con);
  }

  /**
   * Create a service to print the report info.
   */
  public forPromotionReport(
    flags: ReportFlags<typeof SfCommand>,
    operationResult: DeploymentResult,
    operationName: string
  ): PromoteReportOutputService {
    return new PromoteReportOutputService(flags, operationResult, operationName);
  }
}
