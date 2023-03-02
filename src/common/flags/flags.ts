/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConfigAggregator, Messages, Org } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { Flags } from '@salesforce/sf-plugins-core';
import { Flags as OclifFlags } from '@oclif/core';
import { TestLevel } from '..';
import ConfigMeta, { ConfigVars } from '../../configMeta';

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

export const bundleVersionName = Flags.string({
  char: 'v',
  summary: messages.getMessage('promote.bundle-version-name.summary'),
  description: messages.getMessage('promote.bundle-version-name.description'),
});

export const async = Flags.boolean({
  description: messages.getMessage('promote.async.description'),
  summary: messages.getMessage('promote.async.summary'),
});

/**
 * Wait flag
 * This is used to determine how many minutes we are going to stream results before giving back the control of the terminal to the user.
 */
export const wait = Flags.duration({
  unit: 'minutes',
  char: 'w',
  summary: messages.getMessage('promote.wait.summary'),
  description: messages.getMessage('promote.wait.description'),
  defaultValue: 33,
  default: Duration.minutes(33),
  helpValue: '<minutes>',
  min: 3,
  exclusive: ['async'],
});

/**
 * Custom flag for the target devops center org.
 * Makes this flag required and validates that passed in alias/username corresponds to an authenticated org.
 * If no value is passed in, then it looks for the alias/username set in the --target-devops-center config variable.
 */
export const requiredDoceOrgFlag = OclifFlags.custom({
  char: 'c',
  summary: messages.getMessage('flags.targetDoceOrg.summary'),
  parse: async (input: string | undefined) => getOrgOrThrow(input),
  default: async () => getOrgOrThrow(),
  defaultHelp: async () => (await getOrgOrThrow())?.getUsername(),
  required: true,
});

export const jobId = Flags.salesforceId({
  char: 'i',
  description: messages.getMessage('flags.job-id.description'),
  summary: messages.getMessage('flags.job-id.summary'),
  exactlyOne: ['use-most-recent', 'job-id'],
});

export const useMostRecent = Flags.boolean({
  char: 'r',
  description: messages.getMessage('flags.use-most-recent.description'),
  summary: messages.getMessage('flags.use-most-recent.summary'),
  exactlyOne: ['use-most-recent', 'job-id'],
});

/**
 *
 * @param input alias/username of an org
 * @returns instance of an Org that correspons to the alias/username passed in
 * or to the alias/username set in --target-devops-center config variable.
 */
const getOrgOrThrow = async (input?: string): Promise<Org> => {
  const aggregator = await ConfigAggregator.create({ customConfigMeta: ConfigMeta });
  const alias = input ? input : aggregator.getInfo(ConfigVars.TARGET_DEVOPS_CENTER)?.value?.toString();
  if (!alias) {
    throw messages.createError('errors.NoDefaultDoceEnv');
  }
  const org: Org = await Org.create({ aliasOrUsername: alias });
  return org;
};
