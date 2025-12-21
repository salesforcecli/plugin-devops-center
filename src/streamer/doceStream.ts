/*
 * Copyright 2025, Salesforce, Inc.
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
   * @param processor The specific processor we want to use for the event
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
