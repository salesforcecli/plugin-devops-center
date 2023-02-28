/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@oclif/test';
import * as core from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { JsonMap } from '@salesforce/ts-types';
import * as sinon from 'sinon';
import { AbstractAorOutputService, AorOutputFlags } from '../../src/common/outputService';
import AsyncOpStreaming from '../../src/streamer/processors/asyncOpStream';

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

const errorEvent = {
  // eslint-disable-next-line camelcase
  sf_devops__Status__c: 'Error',
  // eslint-disable-next-line camelcase
  sf_devops__Error_Details__c: 'Error here',
  ChangeEventHeader: { recordIds: ['testId'] },
};

const completedEvent = {
  // eslint-disable-next-line camelcase
  sf_devops__Message__c: 'prints something completed',
  // eslint-disable-next-line camelcase
  sf_devops__Status__c: 'Completed',
  ChangeEventHeader: { recordIds: ['testId'] },
};

const inProgressEvent = {
  // eslint-disable-next-line camelcase
  sf_devops__Message__c: 'prints something in progress',
  // eslint-disable-next-line camelcase
  sf_devops__Status__c: 'In Progress',
  ChangeEventHeader: { recordIds: ['testId'] },
};

describe('AsyncOpStreaming', () => {
  let sandbox: sinon.SinonSandbox;
  let instance: AsyncOpStreamingTest;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(core.Org, 'create' as any).returns(DOCE_ORG);
    instance = new AsyncOpStreamingTest(
      await core.Org.create({ aliasOrUsername: 'test@salesforce.com' }),
      Duration.minutes(3),
      'testId',
      new OutputServiceTest()
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('startStreaming', () => {
    it('it calls startStream', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startStream = sandbox.stub(AsyncOpStreamingTest.prototype, 'startStream' as any);
      await instance.monitor();

      expect(startStream.called).to.equal(true);
    });
  });

  describe('startAsyncOpStreamProcessor', () => {
    test.stdout().it('it handles a completed event', async (ctx) => {
      const result = instance.asyncOpStreamProcessorStub(completedEvent);

      expect(result.completed).to.be.equal(true);
      expect(result.payload).to.be.equal(completedEvent);
      expect(ctx.stdout).to.contain('prints something completed');
    });

    test.stdout().it('it handles an inPorgress event', async (ctx) => {
      const result = instance.asyncOpStreamProcessorStub(inProgressEvent);

      expect(result.completed).to.be.equal(false);
      expect(ctx.stdout).to.contain('prints something in progress');
    });

    test.stdout().it('it handles an error', async (ctx) => {
      const result = instance.asyncOpStreamProcessorStub(errorEvent);

      expect(result.completed).to.be.equal(true);
      expect(result.payload).to.be.equal(errorEvent);
      expect(ctx.stdout).to.contain('Error here');
    });
  });
});

class AsyncOpStreamingTest extends AsyncOpStreaming {
  public asyncOpStreamProcessorStub(event: JsonMap) {
    return this.asyncOpStreamProcessor(event);
  }
}

class OutputServiceTest extends AbstractAorOutputService<AorOutputFlags> {
  public constructor() {
    super({}, '');
  }

  // eslint-disable-next-line class-methods-use-this
  public printOpSummary(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
