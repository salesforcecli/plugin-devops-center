/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org, StreamingClient, StatusResult } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { Duration } from '@salesforce/kit';
import Stream from './stream';
export default abstract class DOCeStreaming implements Stream {
  private doceOrg: Org;
  private wait: Duration;

  public constructor(org: Org, wait: Duration) {
    this.doceOrg = org;
    this.wait = wait;
  }

  /**
   * This class creates the client and starts listening to events.
   *
   * @param event The event we want to proccess (CDC)
   * @param processor The especific processor we want to use for the event
   */
  public async startStream(event: string, processor: (message: JsonMap) => StatusResult): Promise<void | AnyJson> {
    const options = new StreamingClient.DefaultOptions(this.doceOrg, event, processor);
    options.setSubscribeTimeout(this.wait);

    const streamClient = await StreamingClient.create(options);
    await streamClient.handshake();
    await streamClient.subscribe();
  }

  /**
   * Sets the initial config for the stream
   */
  protected abstract startStreaming(): Promise<void | AnyJson>;
}
