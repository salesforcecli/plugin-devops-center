/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfCommand } from '@salesforce/sf-plugins-core';
import { ux } from '@oclif/core';
import { Flags } from '../base/abstractReportOnPromote';
import { sObjectToArrayOfKeyValue } from '../utils';
import { DeploymentResult } from '../types';
import { tableHeader } from './outputUtils';
import { AbstractDeploymentResultOutputService, DeploymentResultOutputService } from './deploymentResultOutputService';
import { OutputFlags } from './outputService';

/* eslint-disable @typescript-eslint/no-empty-interface */

/**
 * Interface for output methods for report operations.
 */
export interface ReportOutputService extends DeploymentResultOutputService {}

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
        verbosity: flags['verbosity'],
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
      .map((x) => {
        x.key = x.key === 'Name' ? 'CreatedByName' : x.key;
        return x;
      })
      // sort by key.
      .sort((a, b) => (a.key < b.key ? -1 : 1));

    const options = { title: tableHeader(`${this.operationName} Info`) };
    const columns = { key: { header: 'Key' }, value: { header: 'Value' } };

    ux.table(formattedDeploymentResult, columns, options);
  }
}
