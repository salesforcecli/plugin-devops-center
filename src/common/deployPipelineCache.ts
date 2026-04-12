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

import { Global, Messages, TTLConfig } from '@salesforce/core';
import { Duration } from '@salesforce/kit';

Messages.importMessagesDirectory(__dirname);
const cacheMessages = Messages.loadMessages('@salesforce/plugin-devops-center', 'cache');

// For the moment we will just store the timestamp
export type AsyncOperationData = Record<string, never>;

/**
 * Caches the AOR data
 *
 * @author JuanStenghele-sf
 */
export class DeployPipelineCache extends TTLConfig<TTLConfig.Options, AsyncOperationData> {
  /**
   * Returns the cache's filename
   */
  public static getFileName(): string {
    return 'deploy-pipeline-cache.json';
  }

  /**
   * Returns the cache's options
   */
  public static getDefaultOptions(): TTLConfig.Options {
    return {
      isGlobal: true,
      isState: false,
      filename: this.getFileName(),
      stateFolder: Global.SF_STATE_FOLDER,
      ttl: Duration.days(3),
    };
  }

  /**
   * Caches the data sent
   */
  public static async set(aorId: string, data: AsyncOperationData): Promise<void> {
    const cache = await DeployPipelineCache.create();
    cache.set(aorId, data);
    await cache.write();
  }

  /**
   * Removes the data associated with the aorId
   */
  public static async unset(aorId: string): Promise<void> {
    const cache = await DeployPipelineCache.create();
    cache.unset(aorId);
    await cache.write();
  }

  /**
   * Updates the aorId with the data sent
   * Merges the data sent with the existing one
   */
  public static async update(aorId: string, data: Partial<TTLConfig.Entry<AsyncOperationData>>): Promise<void> {
    const cache = await DeployPipelineCache.create();
    cache.update(aorId, data);
    await cache.write();
  }

  /**
   * Returns the data associated with the aorId
   */
  public get(aorId: string): TTLConfig.Entry<AsyncOperationData> {
    return super.get(aorId);
  }

  /**
   * Returns the latest data cached or throws if can't find any.
   */
  public getLatestKeyOrThrow(): string {
    const aorId = this.getLatestKey();
    if (!aorId) {
      throw cacheMessages.createError('error.NoRecentAorId');
    }
    return aorId;
  }
}
