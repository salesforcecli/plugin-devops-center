/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org, StreamingClient, StatusResult } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { Duration } from '@salesforce/kit';
import DoceMonitor from './doceMonitor';

/**
 * Common base class for DOCe monitor that use the streaming api to listen to a streaming channel (CDC).
 */
export default abstract class DOCeStreaming implements DoceMonitor {
  private doceOrg: Org;
  private wait: Duration;

  public constructor(org: Org, wait: Duration) {
    this.doceOrg = org;
    this.wait = wait;
  }

  /**
   * This creates the streaming client and starts listening the desired streaming channel.
   *
   * @param channel The channel we want to listen (CDC)
   * @param processor The especific processor we want to use for the event
   */
  protected async startStream(channel: string, processor: (message: JsonMap) => StatusResult): Promise<void | AnyJson> {
    const options = new StreamingClient.DefaultOptions(this.doceOrg, channel, processor);
    options.setSubscribeTimeout(this.wait);

    const streamClient = await StreamingClient.create(options);
    await streamClient.handshake();
    await streamClient.subscribe();
  }

  public abstract monitor(): Promise<void | AnyJson>;
}
