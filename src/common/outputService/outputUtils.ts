/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { StandardColors } from '@salesforce/sf-plugins-core';
import { blue, bold } from 'chalk';
import { AsyncOperationStatus } from '../types';

export function tableHeader(message: string): string {
  return blue(bold(message));
}
export function colorStatus(status: AsyncOperationStatus): string {
  if (status === AsyncOperationStatus.Completed) return StandardColors.success(status);
  if (status === AsyncOperationStatus.Error) return StandardColors.error(status);
  else return StandardColors.warning(status);
}
