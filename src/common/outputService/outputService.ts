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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ux } from '@oclif/core';

export type OutputFlags = {
  verbose?: boolean;
  concise?: boolean;
};

/**
 * Service interface to print the output
 *
 * @author JuanStenghele-sf
 */
export type OutputService = {
  /**
   * Prints a summary of the operation being done
   */
  printOpSummary(): void;
}

/**
 * Abstract class that implements OutputService interface
 *
 * @author JuanStenghele-sf
 */
export abstract class AbstractOutputService<T extends OutputFlags> implements OutputService {
  // We will store here the command flags
  protected flags: T;

  public constructor(flags: T) {
    this.flags = flags;
  }

  // eslint-disable-next-line class-methods-use-this
  public displayTable(rows: any[], title: string, columns: ux.Table.table.Columns<any>): void {
    ux.log();
    ux.styledHeader(title);
    ux.table(rows, columns);
    ux.log();
  }

  public abstract printOpSummary(): void;
}
