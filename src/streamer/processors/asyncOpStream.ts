/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org, StatusResult } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson, JsonMap, ensureJsonMap } from '@salesforce/ts-types';
import { DOCeStreaming } from '../doceStream';

export default class AsyncOpStreaming extends DOCeStreaming {
  public constructor(org: Org, wait: Duration) {
    super(org, wait);
  }

  /**
   * It sends the correct config to the streamer
   *
   * @param asyncOpId the Id of the AOR we want to inspect
   * @returns
   */
  public async startStreaming(asyncOpId: string): Promise<void | AnyJson> {
    return this.startStream(
      '/data/Async_Operation_Result__ChangeEvent',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.startAsyncOpStreamProcessor.bind(this),
      asyncOpId
    );
  }

  /**
   * This is the processor for the AOR CDC
   *
   * @param event The event JSON from the CDC
   * @returns StatusResult
   */
  private startAsyncOpStreamProcessor(event: JsonMap): StatusResult {
    const pl = ensureJsonMap(event.payload);

    const c = ensureJsonMap(pl.ChangeEventHeader);

    // eslint-disable-next-line no-console
    console.log(pl.sf_devops__Message__c);

    if (
      c.recordIds != null &&
      c.recordIds[0] === this.getIdtoInspect() &&
      (pl.sf_devops__Status__c === 'Completed' || pl.sf_devops__Status__c === 'Error')
    ) {
      if (pl.sf_devops__Error_Details__c) {
        // eslint-disable-next-line no-console
        console.log('Error details: ' + JSON.stringify(pl.sf_devops__Error_Details__c));
      }
      return {
        completed: true,
        payload: pl,
      };
    }
    return { completed: false };
  }
}
