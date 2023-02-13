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
    super(org, wait, new Array(idToInspect));
  }

  /**
   * It sends the correct config to the streamer
   */
  public async startStreaming(): Promise<void | AnyJson> {
    return this.startStream(
      ASYNC_OPERATION_CDC,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.startAsyncOpStreamProcessor.bind(this)
    );
  }

  /**
   * This is the processor for the AOR CDC
   *
   * @param event The event JSON from the CDC
   * @returns StatusResult Completed: true => will end the stream.
   */
  protected startAsyncOpStreamProcessor(event: JsonMap): StatusResult {
    const jsonPayload = ensureJsonMap(event.payload);

    const changeEventHeader = ensureJsonMap(jsonPayload.ChangeEventHeader);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (changeEventHeader.recordIds != null && this.isValidIdToInspect(changeEventHeader.recordIds[0])) {
      // in a future we want to test !Is_Completed__c

      // Print the message from the payload if it exists
      if (jsonPayload.sf_devops__Message__c) {
        // eslint-disable-next-line no-console
        console.log(jsonPayload.sf_devops__Message__c);
      }

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
      } else {
        return { completed: false };
      }
    }
    return { completed: false };
  }
}
