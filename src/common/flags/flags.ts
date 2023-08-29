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
import { BooleanFlag, OptionFlag } from '@oclif/core/lib/interfaces';
import ConfigMeta, { ConfigVars } from '../../configMeta';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonFlags');

export const devopsCenterProjectName: OptionFlag<string> = Flags.string({
  char: 'p',
  summary: messages.getMessage('flags.devops-center-project-name.summary'),
  required: true,
});

/**
 * Wait flag
 * This is used to determine how many minutes we are going to stream results before giving back the control of the terminal to the user.
 */
export const wait: OptionFlag<Duration> = Flags.duration({
  unit: 'minutes',
  char: 'w',
  summary: messages.getMessage('flags.wait.summary'),
  description: messages.getMessage('flags.wait.description'),
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
  defaultHelp: async () => getDefaultDevopsCenterUsernameAlias(),
  required: true,
});

export const jobId: OptionFlag<string | undefined> = Flags.salesforceId({
  char: 'i',
  description: messages.getMessage('flags.job-id.description'),
  summary: messages.getMessage('flags.job-id.summary'),
  exactlyOne: ['use-most-recent', 'job-id'],
});

export const useMostRecent: BooleanFlag<boolean> = Flags.boolean({
  char: 'r',
  description: messages.getMessage('flags.use-most-recent.description'),
  summary: messages.getMessage('flags.use-most-recent.summary'),
  exactlyOne: ['use-most-recent', 'job-id'],
});

export const verbose: BooleanFlag<boolean> = Flags.boolean({
  summary: messages.getMessage('flags.verbose.summary'),
});

export const concise: BooleanFlag<boolean> = Flags.boolean({
  summary: messages.getMessage('flags.concise.summary'),
  exclusive: ['verbose'],
});

/**
 * Helper to get the userneame or alias of the default Devops Center org
 * from the target-devops-center config variable.
 */
export const getDefaultDevopsCenterUsernameAlias = async (): Promise<string | undefined> => {
  const config = await ConfigAggregator.create({ customConfigMeta: ConfigMeta });
  return config.getInfo(ConfigVars.TARGET_DEVOPS_CENTER)?.value?.toString();
};

/**
 *
 * @param input alias/username of an org
 * @returns instance of an Org that correspons to the alias/username passed in
 * or to the alias/username set in --target-devops-center config variable.
 */
const getOrgOrThrow = async (input?: string): Promise<Org> => {
  const usernameOrAlias = input ? input : await getDefaultDevopsCenterUsernameAlias();
  if (!usernameOrAlias) {
    throw messages.createError('errors.NoDefaultDoceEnv');
  }
  const org: Org = await Org.create({ aliasOrUsername: usernameOrAlias });
  return org;
};
