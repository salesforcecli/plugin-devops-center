/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Global, Messages, TTLConfig } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { JsonMap, Nullable } from '@salesforce/ts-types';

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
  public static async update(aorId: string, data: JsonMap): Promise<void> {
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
    if (!aorId || aorId === 'undefined') {
      throw cacheMessages.createError('error.NoRecentAorId');
    }

    return aorId;
  }
  public resolveLatest(useMostRecent: boolean, key: Nullable<string>): string {
    const jobId = useMostRecent ? this.getLatestKeyOrThrow() : key;

    if (!jobId) {
      throw cacheMessages.createError('error.InvalidJobId');
    }

    return this.resolveLongId(jobId);
  }

  public resolveLongId(jobId: string): string {
    if (jobId.length === 18) {
      return jobId;
    } else if (jobId.length === 15) {
      const resolvedId = this.keys().find((k) => k.startsWith(jobId));
      if (!resolvedId) {
        throw cacheMessages.createError('error.InvalidJobId', [jobId]);
      }
      return resolvedId;
    } else {
      throw cacheMessages.createError('error.InvalidJobId', [jobId]);
    }
  }
}
