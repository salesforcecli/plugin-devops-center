/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { Flags } from '@salesforce/sf-plugins-core';
import { Flags as OclifFlags } from '@oclif/core';
import { BooleanFlag, OptionFlag } from '@oclif/core/lib/interfaces';
import { TestLevel } from '../..';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'promoteFlags');

export const branchName: OptionFlag<string> = Flags.string({
  char: 'b',
  summary: messages.getMessage('promote.branch-name.summary'),
  required: true,
});

/**
 * Custom flag for the test level.
 * Validates that the passed in value is a valid test level.
 */
export const testLevel = OclifFlags.custom<TestLevel>({
  char: 'l',
  parse: (input) => Promise.resolve(input as TestLevel),
  options: Object.values(TestLevel),
  description: messages.getMessage('promote.test-level.description'),
  summary: messages.getMessage('promote.test-level.summary'),
});

export const specificTests: OptionFlag<string[] | undefined> = Flags.string({
  char: 't',
  multiple: true,
  description: messages.getMessage('promote.tests.description'),
  summary: messages.getMessage('promote.tests.summary'),
});

export const deployAll: BooleanFlag<boolean> = Flags.boolean({
  char: 'a',
  description: messages.getMessage('promote.deploy-all.description'),
  summary: messages.getMessage('promote.deploy-all.summary'),
});

export const bundleVersionName: OptionFlag<string | undefined> = Flags.string({
  char: 'v',
  summary: messages.getMessage('promote.bundle-version-name.summary'),
  description: messages.getMessage('promote.bundle-version-name.description'),
});

export const async: BooleanFlag<boolean> = Flags.boolean({
  description: messages.getMessage('promote.async.description'),
  summary: messages.getMessage('promote.async.summary'),
});
