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

import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Flags } from '../base/abstractReportOnPromote.js';
import { sObjectToArrayOfKeyValue } from '../utils.js';
import { DeploymentResult } from '../types.js';
import { tableHeader } from './outputUtils.js';
import {
  AbstractDeploymentResultOutputService,
  DeploymentResultOutputService,
} from './deploymentResultOutputService.js';
import { OutputFlags } from './outputService.js';

/* eslint-disable @typescript-eslint/no-empty-interface */

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'project.deploy.pipeline.report');

/**
 * Interface for output methods for report operations.
 */
export type ReportOutputService = DeploymentResultOutputService;

/**
 * Base class.
 */
export abstract class AbstractReportOutputService<T extends OutputFlags>
  extends AbstractDeploymentResultOutputService<T>
  implements ReportOutputService {}

export class PromoteReportOutputService extends AbstractReportOutputService<OutputFlags> {
  private operationName: string;

  public constructor(flags: Flags<typeof SfCommand>, deploymentResult: DeploymentResult, operationName: string) {
    super(
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        verbose: flags['verbose'],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        concise: flags['concise'],
      },
      deploymentResult
    );
    this.operationName = operationName;
  }

  public printOpSummary(): void {
    this.printDeploymentResult();
  }

  public printDeploymentResult(): void {
    // convert every field of the deployment result record into a key:value pair.
    const formattedDeploymentResult = sObjectToArrayOfKeyValue(this.deploymentResult)
      // rename User.Name field.
      .map((x) => ({
        ...x,
        key: x.key === 'Name' ? messages.getMessage('report.key.created-by-name') : x.key,
      }))
      // sort by key.
      .sort((a, b) => (a.key < b.key ? -1 : 1));

    const columns = [
      { key: 'key', name: messages.getMessage('report.key.column') },
      { key: 'value', name: messages.getMessage('report.value.column') },
    ];

    this.displayTable(
      formattedDeploymentResult,
      tableHeader(`${this.operationName} ${messages.getMessage('report.info.header')}`),
      columns
    );
  }
}
