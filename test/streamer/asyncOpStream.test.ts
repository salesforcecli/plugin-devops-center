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
import * as sinon from 'sinon';
import * as Utils from '../../src/common/utils';
import AsyncOpStreaming from '../../src/streamer/processors/asyncOpStream';

let payloadType;

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

const getPayload = () => {
  switch (payloadType) {
    case 'completed':
      return completedPayload;
    case 'error':
      return errorPayload;
    default:
      return inProgressPayload;
  }
};

const errorPayload = {
  // eslint-disable-next-line camelcase
  sf_devops__Status__c: 'Error',
  // eslint-disable-next-line camelcase
  sf_devops__Error_Details__c: 'Error here',
  ChangeEventHeader: { recordIds: ['testId'] },
};

const completedPayload = {
  // eslint-disable-next-line camelcase
  sf_devops__Message__c: 'prints something new',
  // eslint-disable-next-line camelcase
  sf_devops__Status__c: 'Completed',
  ChangeEventHeader: { recordIds: ['testId'] },
};

const inProgressPayload = {
  // eslint-disable-next-line camelcase
  sf_devops__Message__c: 'prints something in progress',
  // eslint-disable-next-line camelcase
  sf_devops__Status__c: 'In Progress',
  ChangeEventHeader: { recordIds: ['testId'] },
};

const stubStreamingClient = async (options?: StreamingClient.Options) => ({
  handshake: async () => StreamingClient.ConnectionState.CONNECTED,
  replay: async () => -1,
  subscribe: async () =>
    options?.streamProcessor({
      payload: getPayload(),
      event: { replayId: 20 },
    }),
});

describe('deploy pipeline', () => {
  let sandbox: sinon.SinonSandbox;
  let getIdFunction;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(core.Org, 'create' as any).returns(DOCE_ORG);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Utils, 'fetchAndValidatePipelineStage' as any);
    payloadType = 'completed';
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('deploy pipeline', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      getIdFunction = sandbox.stub(AsyncOpStreaming.prototype, <any>'getIdtoInspect').returns('testId');
    });

    test
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(core.StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      })
      .stdout()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--wait=3'])
      .it('runs deploy:pipeline  -p=testProject -b=testBranch --wait=3', (ctx) => {
        expect(ctx.stdout).to.contain('prints something');
      });

    test
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(core.StreamingClient, 'create' as any).throwsException({ name: 'GenericTimeoutError' });
      })
      .stdout()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--wait=3'])
      .it('runs deploy:pipeline  -p=testProject -b=testBranch --wait=3 and handles a GenericTimeoutError', (ctx) => {
        expect(ctx.stdout).not.to.contain('prints something');
      });

    test
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(core.StreamingClient, 'create' as any).throwsException({ name: 'BoomError' });
      })
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--wait=3'])
      .it('runs deploy:pipeline  -p=testProject -b=testBranch --wait=3 and throws an error to the console ', (ctx) => {
        expect(ctx.stderr).to.contain('BoomError');
      });

    test
      .do(() => {
        payloadType = 'error';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(core.StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      })
      .stdout()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--wait=3'])
      .it('runs deploy:pipeline  -p=testProject -b=testBranch --wait=3 and throws an error to the console ', (ctx) => {
        expect(ctx.stdout).to.contain('Error here');
      });

    test
      .do(() => {
        payloadType = 'inProgress';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(core.StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      })
      .stdout()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--wait=3'])
      .it('runs deploy:pipeline  -p=testProject -b=testBranch --wait=3 and throws an error to the console ', (ctx) => {
        expect(ctx.stdout).to.contain('prints something in progress');
      });
  });

  describe('idToInspect', () => {
    test
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sandbox.stub(core.StreamingClient, 'create' as any).callsFake(stubStreamingClient);
      })
      .stdout()
      .it('checks the idToInspect', async () => {
        const streamer = new AsyncOpStreamingTest(
          await core.Org.create({ aliasOrUsername: 'test@salesforce.com' }),
          Duration.minutes(3)
        );
        await streamer.startStreaming('testIdToInspect');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(getIdFunction.called).to.equal(true);
        expect(streamer.getIdtoInspectStub()).to.equal('testIdToInspect');
      });
  });
});

class AsyncOpStreamingTest extends AsyncOpStreaming {
  public getIdtoInspectStub() {
    return this.getIdtoInspect();
  }
}
