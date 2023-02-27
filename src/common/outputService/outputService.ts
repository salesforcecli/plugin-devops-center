/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export type OutputFlags = {
  verbosity: boolean;
  consice: boolean;
};

/**
 * Service interface to print the output
 *
 * @author JuanStenghele-sf
 */
export interface OutputService {
  /**
   * Prints a summary of the operation being done
   */
  printOpSummary(): Promise<void>;
}

/**
 * Abstract class that implements OutputService interface
 *
 * @author JuanStenghele-sf
 */
export abstract class AbstractOutputService<T extends OutputFlags> implements OutputService {
  protected flags: Partial<T>;

  public constructor(flags: Partial<T>) {
    this.flags = flags;
  }

  public abstract printOpSummary(): Promise<void>;
}
