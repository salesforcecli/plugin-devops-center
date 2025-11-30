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
