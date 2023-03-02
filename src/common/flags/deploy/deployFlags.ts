/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { Flags } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectory(__dirname);
const deployFlags = Messages.loadMessages('@salesforce/plugin-devops-center', 'deployFlags');

export const verbose = Flags.boolean({
  summary: deployFlags.getMessage('deploy.verbosity.summary'),
  description: deployFlags.getMessage('deploy.verbosity.description'),
});

export const concise = Flags.boolean({
  summary: deployFlags.getMessage('deploy.concise.summary'),
  description: deployFlags.getMessage('deploy.concise.description'),
  exclusive: ['verbose'],
});
