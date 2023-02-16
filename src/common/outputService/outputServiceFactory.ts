/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { DeployOutputService } from './deployOutputService';

/**
 * Factory service for creating output services
 *
 * @author JuanStenghele-sf
 */
export abstract class OutputServiceFactory {
  /**
   * Create a service to print the deployment info.
   */
  public static forDeployment(con: Connection): DeployOutputService {
    return new DeployOutputService(con);
  }
}
