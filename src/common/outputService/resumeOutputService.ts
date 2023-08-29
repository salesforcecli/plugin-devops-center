/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
export interface ResumeOutputService extends AorOutputService {
  displayEndResults(): void;
}

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
