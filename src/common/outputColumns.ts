/*
 * Copyright 2025, Salesforce, Inc.
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

import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const tableElements = Messages.loadMessages('@salesforce/plugin-devops-center', 'project.deploy.pipeline.start');

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
  validateDeployTitle: tableElements.getMessage('deployComponent.table.validateDeployTitle'),
};
