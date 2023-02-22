/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@oclif/test';
import { Duration } from '@salesforce/kit';
import { StreamingClient, Org, StatusResult } from '@salesforce/core';
import * as sinon from 'sinon';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import DOCeStreaming from '../../src/streamer/doceStream';

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getAlias() {
    return ['doceOrg'];
  },
  getUsername() {
    return 'test@salesforce.com';
  },
  getConnection() {
    return {
      getApiVersion: () => '1',
    };
  },
};

const stubStreamingClient = async (options?: StreamingClient.Options) => ({
  handshake: async () => StreamingClient.ConnectionState.CONNECTED,
  replay: async () => -1,
  subscribe: async () =>
    options?.streamProcessor({
      payload: { message: 'Completed' },
      event: { replayId: 20 },
    }),
});

//
const testProcessor = (event: JsonMap) => ({ completed: true, payload: event.payload } as StatusResult);

describe('DOCeStreaming', () => {
  let sandbox: sinon.SinonSandbox;
  let instance: DOCeStreamingTest;
  let streamingClient;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(DOCE_ORG);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    instance = new DOCeStreamingTest(await Org.create({ aliasOrUsername: 'test@salesforce.com' }), Duration.minutes(3));
  });

  afterEach(() => {
    sandbox.restore();
  });

  test
    .do(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      streamingClient = sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
    })
    .it('it correctly handles the stream creation', async () => {
      await instance.monitor();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(streamingClient.called).to.equal(true);
    });

  test
    .do(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      streamingClient = sandbox.stub(StreamingClient, 'create' as any).throwsException({ name: 'BoomError' });
    })
    .it('it correctly handles streamingClient error', async () => {
      try {
        await instance.monitor();
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(error.name).to.equal('BoomError');
      }
    });
});

class DOCeStreamingTest extends DOCeStreaming {
  public constructor(org: Org, wait: Duration) {
    super(org, wait);
  }

  // eslint-disable-next-line class-methods-use-this
  public monitor(): Promise<void | AnyJson> {
    return this.startStream('event', testProcessor);
  }
}
