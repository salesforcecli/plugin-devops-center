/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { Nullable } from '@salesforce/ts-types';
import { TestLevel } from '../common';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.pipeline');

export function validateTestFlags(testLevel: Nullable<TestLevel>, tests: Nullable<string[]>): void {
  if (testLevel === TestLevel.RunSpecifiedTests && (tests ?? []).length === 0) {
    throw messages.createError('error.NoTestsSpecified');
  } else if (testLevel !== TestLevel.RunSpecifiedTests && tests) {
    throw messages.createError('error.InvalidRunTests');
  }
}
