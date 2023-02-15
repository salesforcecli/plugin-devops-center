/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@oclif/test';
import * as core from '@salesforce/core';
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

describe('AsyncOpStreaming', () => {
  let sandbox: sinon.SinonSandbox;
  let instance: SObjectStreamingTest;

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
      const startStream = sandbox.stub(SObjectStreaming.prototype, 'startStream' as any);
      await instance.watchForSObjectTest(processor);
      expect(startStream.called).to.equal(true);

      const args = startStream.getCall(0).args;
      expect(args[0]).to.equal('channel');
    });
  });

  describe('matchingProcessor', () => {
    test.stdout().it('it does not call the matchProcessor', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(SObjectStreaming.prototype, 'startStream' as any);
      await instance.watchForSObjectTest(processor);
      const result = instance.matchingProcessorTest(channelEvent);
      expect(result.completed).to.equal(false);
    });

    test.it('it does call the matchProcessor', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sandbox.stub(SObjectStreaming.prototype, 'startStream' as any);
      await instance.watchForSObjectTest(processor);
      channelEvent.payload.ChangeEventHeader = { recordIds: ['aorId'] };
      const result = instance.matchingProcessorTest(channelEvent);
      expect(result.completed).to.equal(true);
      expect(result.payload).to.equal(channelEvent.payload);
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

  public matchingProcessorTest(event: JsonMap) {
    return this.matchingProcessor(event);
  }
}
