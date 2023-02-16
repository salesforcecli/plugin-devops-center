/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console */

import { AsyncOperationResult } from '../types';

/**
 * Service class to print the output
 *
 * @author JuanStenghele-sf
 */
export abstract class OutputService {
  /**
   * Prints the status of the given aor
   */
  public static printAorStatus(aor: AsyncOperationResult): void {
    console.log(aor.sf_devops__Status__c);
  }
}
