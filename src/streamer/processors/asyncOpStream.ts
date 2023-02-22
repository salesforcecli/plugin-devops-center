/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org, StatusResult } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson, JsonMap, ensureJsonMap } from '@salesforce/ts-types';
import SObjectStreaming from '../sObjectStream';
import { ASYNC_OPERATION_CDC } from '../../common/constants';

export default class AsyncOpStreaming extends SObjectStreaming {
  public constructor(org: Org, wait: Duration, idToInspect: string) {
    super(org, wait, new Array(idToInspect), ASYNC_OPERATION_CDC);
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

    // Print the message from the payload if it exists
    if (jsonPayload.sf_devops__Message__c) {
      // eslint-disable-next-line no-console
      console.log(jsonPayload.sf_devops__Message__c);
    }
    // In a future we want to test !Is_Completed__c instead of Status != In Progress
    if (jsonPayload.sf_devops__Status__c && jsonPayload.sf_devops__Status__c !== 'In Progress') {
      // Verify if any error
      if (jsonPayload.sf_devops__Error_Details__c) {
        // eslint-disable-next-line no-console
        console.log('Error details: ' + JSON.stringify(jsonPayload.sf_devops__Error_Details__c));
      }
      return {
        completed: true,
        payload: jsonPayload,
      };
    }
    return { completed: false };
  }
}
