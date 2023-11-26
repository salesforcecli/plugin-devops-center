/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as spawnSync from 'node:child_process';
import { expect } from '@oclif/test';
import * as sinon from 'sinon';
import configMeta from '../src/configMeta';

const SUCCESS_STATUS = 0;
const ERROR_STATUS = 1;

describe('configMeta', () => {
  const confVarInput = configMeta[0].input;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function mockSpawnSync(status: number): sinon.SinonStub {
    return sandbox.stub(spawnSync, 'spawnSync').returns({
      status,
      stdout: '',
      pid: 0,
      output: [],
      stderr: '',
      signal: null,
    });
  }

  it('considers invalid an unauthenticated org', () => {
    const org = 'unauthenticated-org';
    const stub = mockSpawnSync(ERROR_STATUS);
    const result = confVarInput.validator(org);
    expect(result).to.be.false;
    expect(stub.called).to.be.true;
    expect(stub.getCall(0).args[1]).to.contain(org);
  });

  it('considers valid an authenticated org', () => {
    const org = 'authenticated-org';
    const stub = mockSpawnSync(SUCCESS_STATUS);
    const result = confVarInput.validator(org);
    expect(result).to.be.true;
    expect(stub.called).to.be.true;
    expect(stub.getCall(0).args[1]).to.contain(org);
  });

  it('returns the correct failed message', () => {
    const org = 'unauthenticated-org';
    expect(confVarInput.failedMessage(org)).to.equal(`org "${org}" is not authenticated`);
  });
});
