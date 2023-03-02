/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const tableElements = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.pipeline');

export const DeployComponentsTable = {
  columns: {
    // eslint-disable-next-line camelcase
    sf_devops__Operation__c: { header: tableElements.getMessage('deployComponent.operation.column') },
    Name: { header: tableElements.getMessage('deployComponent.name.column') },
    Type: { header: tableElements.getMessage('deployComponent.type.column') },
    // eslint-disable-next-line camelcase
    sf_devops__File_Path__c: { header: tableElements.getMessage('deployComponent.path.column') },
  },
  title: tableElements.getMessage('deployComponent.table.title'),
};
