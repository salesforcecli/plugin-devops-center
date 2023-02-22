/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, class-methods-use-this */

import { green, red } from 'chalk';
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
  public printAorStatus(aor: AsyncOperationResult): void {
    if (aor.sf_devops__Status__c === undefined || aor.sf_devops__Status__c === 'In Progress') {
      console.log(aor.sf_devops__Message__c);
    } else if (aor.sf_devops__Status__c === 'Completed') {
      console.log(green(aor.sf_devops__Message__c));
    } else if (aor.sf_devops__Status__c === 'Error' && aor.sf_devops__Error_Details__c) {
      console.log(red(`${aor.sf_devops__Message__c}\nError details: ${aor.sf_devops__Error_Details__c}`));
    }
  }

  /**
   * Prints the aor id
   */
  public printAorId(aorId: string): void {
    console.log(`Job ID: ${aorId}\n`);
  }

  /**
   * Prints a summary for an async run
   */
  public abstract printAsyncRunInfo(aorId: string): void;

  /**
   * Prints the progress summary
   */
  public abstract printProgressSummary(aorId: string, branch: string): Promise<void>;
}
