/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console, class-methods-use-this */
import { DeploymentResult } from '../types';
import { AbstractOutputService, OutputFlags, OutputService } from './outputService';

/**
 * Service interface for printing the output of a deployment result.
 */
export interface DeploymentResultOutputService extends OutputService {
  /**
   * Prints the deployment result.
   */
  printDeploymentResult(): void;
}

export abstract class AbstractDeploymentResultOutputService<T extends OutputFlags>
  extends AbstractOutputService<T>
  implements DeploymentResultOutputService
{
  protected deploymentResult: DeploymentResult;

  public constructor(flags: T, deploymentResult: DeploymentResult) {
    super(flags);
    this.deploymentResult = deploymentResult;
  }

  /**
   * Prints a report of the operation.
   */
  public abstract printOpSummary(): void;

  /**
   * Prints the deployment result.
   */
  public abstract printDeploymentResult(): void;
}
