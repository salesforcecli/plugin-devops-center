/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable camelcase */

import { Org, StatusResult } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson, JsonMap, ensureJsonMap } from '@salesforce/ts-types';
import SObjectStreaming from '../sObjectStream';
import { ASYNC_OPERATION_CDC } from '../../common/constants';
import { AsyncOperationResult, AsyncOperationStatus } from '../../common/types';
import { OutputService } from '../../common/outputService/outputService';

export default class AsyncOpStreaming extends SObjectStreaming {
  private outputService: OutputService;

  public constructor(org: Org, wait: Duration, idToInspect: string, outputService: OutputService) {
    super(org, wait, new Array(idToInspect), ASYNC_OPERATION_CDC);
    this.outputService = outputService;
  }

  /**
   * Connects to the AsyncOperationResults CDC channel and begins to monit for changes to the AOR we are monitoring.  If the AOR......
   */
  public async monitor(): Promise<void | AnyJson> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.watchForSObject(this.asyncOpStreamProcessor.bind(this));
  }

  /**
   * This is the processor for the AOR. While InProgress we print the message from the AOR. We finish the stream after completed or errored.
   *
   * @param payload The payload from the CDC event
   * @returns StatusResult Completed: true => will end the stream.
   */
  // eslint-disable-next-line class-methods-use-this
  protected asyncOpStreamProcessor(payload: JsonMap): StatusResult {
    const jsonPayload = ensureJsonMap(payload);

    // We build an aor given the payload
    const asyncOpResult: AsyncOperationResult = jsonPayload as AsyncOperationResult;

    // Print the aor status
    this.outputService.printAorStatus(asyncOpResult);

    // In a future we want to test !Is_Completed__c instead of Status != In Progress
    if (asyncOpResult.sf_devops__Status__c && asyncOpResult.sf_devops__Status__c !== 'In Progress') {
      return {
        completed: true,
        payload: jsonPayload,
      };
    }
    return { completed: false };
  }
}
