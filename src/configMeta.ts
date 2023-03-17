/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { spawnSync } from 'child_process';
import { ConfigValue, Messages } from '@salesforce/core';

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
    input: {
      validator: (value: ConfigValue): boolean => {
        const result = spawnSync('sf', ['force:org:display', '-u', value as string]);
        return result.status === 0;
      },
      failedMessage: (value: ConfigValue): string =>
        messages.getMessage('error.OrgNotAuthenticated', [value as string]),
    },
  },
];
