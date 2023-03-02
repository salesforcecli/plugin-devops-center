/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/no-explicit-any, class-methods-use-this */

import { CliUx } from '@oclif/core';

export function displayTable(
  rows: any[],
  columns: CliUx.Table.table.Columns<any>,
  title: string,
  options?: CliUx.Table.table.Options
): void {
  CliUx.ux.log();
  CliUx.ux.styledHeader(title);
  if (options) {
    CliUx.ux.table(rows, columns, options);
  } else {
    CliUx.ux.table(rows, columns);
  }
}
