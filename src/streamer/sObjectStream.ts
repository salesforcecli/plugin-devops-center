/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org, StatusResult } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson, JsonMap, ensureJsonMap } from '@salesforce/ts-types';
import { containsSfId } from '../common/utils';
import DOCeStreaming from './doceStream';

export default abstract class SObjectStreaming extends DOCeStreaming {
  private idsToInspect: string[];
  private channelName: string;

  protected constructor(org: Org, wait: Duration, idsToInspect: string[], channelName: string) {
    super(org, wait);
    this.idsToInspect = idsToInspect;
    this.channelName = channelName;
  }

  /**
   * This method sets the processor we will need inside the matchingProcessor and will start the stream.
   *
   * @param matchProcessor This processor will be used in the matchingProcessor, it's provided by each implementation.
   */
  protected async watchForSObject(matchProcessor: (message: JsonMap) => StatusResult): Promise<void | AnyJson> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.startStream(this.channelName, (event: JsonMap) => this.matchingProcessor(event, matchProcessor));
  }

  /**
   * This method processes if the event is valid for the IDs we want to monitor.
   *
   * @param event JsonMap containing the event from the streaming channel.
   * @returns If the event is valid, the matchProcessor will handle the response. If it's not valid, we continue listening.
   */
  protected matchingProcessor(event: JsonMap, matchProcessor: (message: JsonMap) => StatusResult): StatusResult {
    const jsonPayload = ensureJsonMap(event.payload);
    const changeEventHeader = ensureJsonMap(jsonPayload.ChangeEventHeader);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (changeEventHeader.recordIds != null && containsSfId(this.idsToInspect, changeEventHeader.recordIds[0])) {
      return matchProcessor(jsonPayload);
    } else {
      return { completed: false };
    }
  }
}
