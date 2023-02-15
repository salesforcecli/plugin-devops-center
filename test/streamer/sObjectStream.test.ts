/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@oclif/test';
import * as core from '@salesforce/core';
import { StreamingClient } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import * as sinon from 'sinon';
import SObjectStreaming from '../../src/streamer/sObjectStream';

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

const channelEvent = {
  payload: {
    // eslint-disable-next-line camelcase
    sf_devops__Message__c: 'Prints something in progress',
    // eslint-disable-next-line camelcase
    sf_devops__Status__c: 'In Progress',
    ChangeEventHeader: { recordIds: ['testId'] },
  },
};

const processor = (jsonPayload: JsonMap) => ({ completed: true, payload: jsonPayload });

const stubStreamingClient = async (options?: StreamingClient.Options) => ({
  handshake: async () => StreamingClient.ConnectionState.CONNECTED,
  replay: async () => -1,
  subscribe: async () =>
    options?.streamProcessor({
      payload: { message: 'Completed' },
      event: { replayId: 20 },
    }),
});

describe('AsyncOpStreaming', () => {
  let sandbox: sinon.SinonSandbox;
  let instance: SObjectStreamingTest;
  const processorSpy = sinon.spy(processor);

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(core.Org, 'create' as any).returns(DOCE_ORG);
    instance = new SObjectStreamingTest(
      await core.Org.create({ aliasOrUsername: 'test@salesforce.com' }),
      Duration.minutes(3),
      'aorId',
      'channel'
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('watchForSObject', () => {
    test.it('it starts the stream', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startStream = sandbox.spy(SObjectStreaming.prototype, 'startStream' as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchingProcessor = sandbox.stub(SObjectStreaming.prototype, 'matchingProcessor' as any);
      await instance.watchForSObjectTest(processor);
      expect(startStream.called).to.equal(true);

      const args = startStream.getCall(0).args;
      expect(args[0]).to.equal('channel');
      expect(args[1] instanceof Function).to.equal(true);
      expect(matchingProcessor.called).to.equal(true);
    });
  });

  describe('matchingProcessor', () => {
    test.stdout().it('it does not call the matchProcessor if the Id is different', async () => {
      const result = instance.matchingProcessorTest(channelEvent, processorSpy);
      expect(result.completed).to.equal(false);
      expect(processorSpy.called).to.equal(false);
    });

    test.stdout().it('it does not call the matchProcessor if recordIds is null', async () => {
      const event = {
        payload: {
          // eslint-disable-next-line camelcase
          sf_devops__Message__c: 'Prints something in progress',
          // eslint-disable-next-line camelcase
          sf_devops__Status__c: 'In Progress',
          ChangeEventHeader: { recordIds: null },
        },
      };
      const result = instance.matchingProcessorTest(event, processorSpy);
      expect(result.completed).to.equal(false);
      expect(processorSpy.called).to.equal(false);
    });

    test.it('it does call the matchProcessor', async () => {
      channelEvent.payload.ChangeEventHeader = { recordIds: ['aorId'] };
      const result = instance.matchingProcessorTest(channelEvent, processorSpy);
      expect(result.completed).to.equal(true);
      expect(result.payload).to.equal(channelEvent.payload);
      expect(processorSpy.called).to.equal(true);
    });

    test.it('Incomplete payload', async () => {
      const event = {
        payload: {
          // eslint-disable-next-line camelcase
          sf_devops__Message__c: 'Prints something in progress',
          // eslint-disable-next-line camelcase
          sf_devops__Status__c: 'In Progress',
        },
      };
      try {
        instance.matchingProcessorTest(event, processorSpy);
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        expect(error.name.includes('UnexpectedValueTypeError')).to.equals(true);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(error.message).to.contains('Value is not a JsonMap');
      }
    });
  });
});

class SObjectStreamingTest extends SObjectStreaming {
  public constructor(org: core.Org, wait: Duration, aorId: string, channelName: string) {
    super(org, wait, new Array(aorId), channelName);
  }

  // eslint-disable-next-line class-methods-use-this
  public monitor(): Promise<void | AnyJson> {
    throw new Error('Method not implemented.');
  }

  public watchForSObjectTest(matchProcessor: (message: JsonMap) => core.StatusResult) {
    return this.watchForSObject(matchProcessor);
  }

  public matchingProcessorTest(event: JsonMap, matchProcessor: (message: JsonMap) => core.StatusResult) {
    return this.matchingProcessor(event, matchProcessor);
  }
}
