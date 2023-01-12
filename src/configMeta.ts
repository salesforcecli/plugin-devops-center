/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'config');

export enum ConfigVars {
  TARGET_DEVOPS_CENTER = 'target-devops-center',
}

/**
 * Creates a configuration variable called --target-devops-center.
 * Once set, it acts as the default target devops center org for the commands in this plugin.
 */
export default [
  {
    key: ConfigVars.TARGET_DEVOPS_CENTER,
    description: messages.getMessage(ConfigVars.TARGET_DEVOPS_CENTER),
    hidden: false,
  },
];
