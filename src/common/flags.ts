/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { Flags } from '@oclif/core';
import { TestLevel } from '../common';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonFlags');

export const devopsCenterProjectName = Flags.string({
  char: 'p',
  summary: messages.getMessage('promote.devops-center-project-name.summary'),
  required: true,
});

export const branchName = Flags.string({
  char: 'b',
  summary: messages.getMessage('promote.branch-name.summary'),
  required: true,
});

export const testLevel = Flags.custom<TestLevel>({
  char: 'l',
  parse: (input) => Promise.resolve(input as TestLevel),
  options: Object.values(TestLevel),
  description: messages.getMessage('promote.test-level.description'),
  summary: messages.getMessage('promote.test-level.summary'),
});

export const specificTests = Flags.string({
  char: 't',
  multiple: true,
  description: messages.getMessage('promote.tests.description'),
  summary: messages.getMessage('promote.tests.summary'),
});

export const deployAll = Flags.boolean({
  char: 'a',
  description: messages.getMessage('promote.deploy-all.description'),
  summary: messages.getMessage('promote.deploy-all.summary'),
});

export const devopsCenterUsername = Flags.string({
  char: 'c',
  summary: messages.getMessage('promote.devops-center-username.summary'),
});

export const bundleVersionName = Flags.string({
  char: 'v',
  summary: messages.getMessage('promote.bundle-version-name.summary'),
  description: messages.getMessage('promote.bundle-version-name.description'),
});
