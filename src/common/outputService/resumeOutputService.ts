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

import { Connection } from '@salesforce/core';
import { DeployComponentsTable } from '../outputColumns';
import { isCheckDeploy } from '../selectors/deploymentResultsSelector';
import { DeployComponent } from '../types';
import { getFormattedDeployComponentsByAyncOpId } from '../utils';
import { AorOutputService, AorOutputFlags, AbstractAorOutputService } from './aorOutputService';

/* eslint-disable @typescript-eslint/no-empty-interface */

/**
 * Interface for output methods for resume operations
 *
 * @author JuanStenghele-sf
 */
export type ResumeOutputService = {
  displayEndResults(): void;
} & AorOutputService

/**
 * Abstract class that implements ResumeOutputService interface
 *
 * @author JuanStenghele-sf
 */
export abstract class AbstractResumeOutputService<T extends AorOutputFlags>
  extends AbstractAorOutputService<T>
  implements ResumeOutputService
{
  protected con: Connection;

  /**
   * This method will print a table of the deployed components for the current AOR
   */
  public async displayEndResults(): Promise<void> {
    if (this.flags.verbose) {
      const isValidateDeploy = await isCheckDeploy(this.con, this.aorId);
      const components: DeployComponent[] = await getFormattedDeployComponentsByAyncOpId(
        this.con,
        this.aorId,
        isValidateDeploy
      );
      const title = isValidateDeploy ? DeployComponentsTable.validateDeployTitle : DeployComponentsTable.title;
      this.displayTable(components, title, DeployComponentsTable.columns);
    }
  }
}
