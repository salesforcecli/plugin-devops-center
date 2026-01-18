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
