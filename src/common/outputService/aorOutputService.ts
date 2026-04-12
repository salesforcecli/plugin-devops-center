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

import { Messages } from '@salesforce/core';
import { green, red } from 'chalk';
import { AsyncOperationResult, AsyncOperationStatus } from '../types';
import { AbstractOutputService, OutputFlags, OutputService } from './outputService';

Messages.importMessagesDirectory(__dirname);
const output = Messages.loadMessages('@salesforce/plugin-devops-center', 'aorOperations.output');

export type AorOutputFlags = {
  async?: boolean;
} & OutputFlags;

/**
 * Service interface for printing the output of async operations
 *
 * @author JuanStenghele-sf
 */
export type AorOutputService = {
  /**
   * Prints the status of the given aor
   */
  printAorStatus(aor: AsyncOperationResult): void;

  /**
   * Prints the aor id
   */
  printAorId(): void;

  /**
   * Sets the aor id
   */
  setAorId(aorId: string): void;

  /**
   * Sets the aor id
   */
  getStatus(): AsyncOperationStatus | undefined;
} & OutputService

/**
 * Abstract class that implements AorOutputService interface
 *
 * @author JuanStenghele-sf
 */
export abstract class AbstractAorOutputService<T extends AorOutputFlags>
  extends AbstractOutputService<T>
  implements AorOutputService
{
  protected aorId: string;
  protected status: AsyncOperationStatus | undefined;

  public constructor(flags: T, aorId: string) {
    super(flags);
    this.aorId = aorId;
  }

  public printAorStatus(aor: AsyncOperationResult): void {
    if (aor.sf_devops__Status__c === AsyncOperationStatus.Completed) {
      console.log(green(aor.sf_devops__Message__c));
    } else if (aor.sf_devops__Status__c === AsyncOperationStatus.Error) {
      if (aor.sf_devops__Error_Details__c) {
        console.log(
          red(
            output.getMessage('output.aor-error-status', [aor.sf_devops__Message__c, aor.sf_devops__Error_Details__c])
          )
        );
      } else {
        console.log(red(aor.sf_devops__Message__c));
      }
    } else if (aor.sf_devops__Message__c) {
      console.log(aor.sf_devops__Message__c);
    }

    this.status = aor.sf_devops__Status__c;
  }

  public printAorId(): void {
    console.log(output.getMessage('output.aor-id', [this.aorId]));
  }

  public setAorId(aorId: string): void {
    this.aorId = aorId;
  }

  public getStatus(): AsyncOperationStatus | undefined {
    return this.status;
  }

  public abstract printOpSummary(): void;
}
