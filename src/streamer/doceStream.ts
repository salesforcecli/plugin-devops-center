/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org, StreamingClient, StatusResult } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { Duration } from '@salesforce/kit';

export abstract class DOCeStreaming {
  private doceOrg: Org;
  private wait: Duration;
  private idToInspect: string;

  public constructor(org: Org, wait: Duration) {
    this.doceOrg = org;
    this.wait = wait;
  }

  /**
   * This class creates the client and starts listening to events.
   *
   * @param event The event we want to proccess (CDC)
   * @param processor The especific processor we want to use for the event
   * @param idToInspect The object ID we want to spect
   */
  protected async startStream(
    event: string,
    processor: (message: JsonMap) => StatusResult,
    idToInspect: string
  ): Promise<void | AnyJson> {
    this.idToInspect = idToInspect;
    const options = new StreamingClient.DefaultOptions(this.doceOrg, event, processor);
    options.setSubscribeTimeout(this.wait);

    try {
      const asyncStatusClient = await StreamingClient.create(options);
      await asyncStatusClient.handshake();
      await asyncStatusClient.subscribe();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.name === 'GenericTimeoutError') {
        // We don't want log the error because we are expecting this timeout
        // Maybe check if the timeout on the command input is the same as the timeout here ?
        return;
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
  }

  /**
   * Returns the Id of the object we want to inspect
   */
  protected getIdtoInspect(): string {
    return this.idToInspect;
  }

  /**
   * Sets the initial config for the stream
   */
  protected abstract startStreaming(idToInspect: string): Promise<void | AnyJson>;
}
