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

import { spawnSync } from 'node:child_process';
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
