/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@oclif/test';
import * as core from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson } from '@salesforce/ts-types';
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
      'testId'
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  test.it('it returns true when the id exists', async () => {
    const result = instance.isValidIdToInspect('testId');
    expect(result).to.be.equal(true);
  });

  test.it('it returns false when the id does not exist', async () => {
    const result = instance.isValidIdToInspect('test');
    expect(result).to.be.equal(false);
  });
});

class SObjectStreamingTest extends SObjectStreaming {
  public constructor(org: core.Org, wait: Duration, idToInspect: string) {
    super(org, wait, new Array(idToInspect));
  }

  public isValidIdToInspect(idToInspect: string): boolean {
    return super.isValidIdToInspect(idToInspect);
  }

  // eslint-disable-next-line class-methods-use-this
  protected startStreaming(): Promise<void | AnyJson> {
    throw new Error('Method not implemented.');
  }
}
