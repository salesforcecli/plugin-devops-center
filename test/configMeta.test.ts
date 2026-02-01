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
