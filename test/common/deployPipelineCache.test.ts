/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from '@oclif/test';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { Global } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { DeployPipelineCache } from '../../src/common/deployPipelineCache';

describe('deployPipelineCache', () => {
  const $$ = new TestContext();

  beforeEach(async () => {
    // Mock the cache
    $$.setConfigStubContents('DeployPipelineCache', {});
  });

  it('stores the object when set is called', async () => {
    // Set a key value pair
    await DeployPipelineCache.set('ABC', {});

    // Retrieve the key set
    const cache = await DeployPipelineCache.create();
    const key = cache.resolveLatest();
    expect(key).to.equal('ABC');
  });

  it('stores the object timestamp when set is called', async () => {
    // Set a key value pair
    await DeployPipelineCache.set('ABC', {});

    // Retrieve the saved object
    const cache = await DeployPipelineCache.create();
    const res = cache.get('ABC');
    expect(res).to.have.property('timestamp');
  });

  it('unsets an existing key', async () => {
    // Set a key value pair
    await DeployPipelineCache.set('ABC', {});

    // Unset the key value pair
    await DeployPipelineCache.unset('ABC');

    // Retrieve the unset entry
    const cache = await DeployPipelineCache.create();
    const res = cache.get('ABC');
    expect(res).to.be.undefined;
  });

  it('cannot unset a non existing key', async () => {
    let excThrown = false;
    try {
      // Unset a key value pair
      await DeployPipelineCache.unset('ABC');
    } catch (err) {
      excThrown = true;
    }
    expect(excThrown);
  });

  function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  it('updates an existing object', async () => {
    // Set a key value pair
    await DeployPipelineCache.set('ABC', {});

    // Get the set timestamp before the update
    let cache = await DeployPipelineCache.create();
    const prevTimestamp = cache.get('ABC')['timestamp'];

    // Update the entry after a small delay
    await delay(10).then(() => DeployPipelineCache.update('ABC', {}));

    // Get the timestamp before the update
    cache = await DeployPipelineCache.create();
    const timestamp = cache.get('ABC')['timestamp'];

    // The timestamps should be different
    expect(prevTimestamp).not.to.be.equal(timestamp);
  });

  it('cannot update a non existing key', async () => {
    let excThrown = false;
    try {
      // Unset a key value pair
      await DeployPipelineCache.update('ABC', {});
    } catch (err) {
      excThrown = true;
    }
    expect(excThrown);
  });

  it('throws an error when trying to get the latest key in a new cache', async () => {
    const cache = await DeployPipelineCache.create();

    let excThrown = false;
    try {
      cache.resolveLatest();
    } catch (err) {
      excThrown = true;
    }
    expect(excThrown);
  });

  it('stores the cache file in the .sf global directory with a 3 day ttl', async () => {
    const options = DeployPipelineCache.getDefaultOptions();
    expect(options.isGlobal);
    expect(options.stateFolder).to.be.equal(Global.SF_STATE_FOLDER);
    expect(options.ttl === Duration.days(3));
  });
});
