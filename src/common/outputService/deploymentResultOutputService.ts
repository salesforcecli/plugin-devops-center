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

/* eslint-disable no-console, class-methods-use-this */
import { DeploymentResult } from '../types';
import { AbstractOutputService, OutputFlags, OutputService } from './outputService';

/**
 * Service interface for printing the output of a deployment result.
 */
export type DeploymentResultOutputService = {
  /**
   * Prints the deployment result.
   */
  printDeploymentResult(): void;
} & OutputService

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
