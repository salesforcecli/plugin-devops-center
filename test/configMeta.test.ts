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

import { expect } from '@oclif/test';
import sinon from 'sinon';
import esmock from 'esmock';

const SUCCESS_STATUS = 0;
const ERROR_STATUS = 1;

describe('configMeta', () => {
  it('considers invalid an unauthenticated org', async () => {
    const org = 'unauthenticated-org';
    const spawnSyncStub = sinon.stub().returns({
      status: ERROR_STATUS,
      stdout: '',
      pid: 0,
      output: [],
      stderr: '',
      signal: null,
    });

    const { default: configMeta } = await esmock('../src/configMeta.js', {
      'node:child_process': {
        default: { spawnSync: spawnSyncStub },
      },
    });

    const confVarInput = configMeta[0].input;
    const result = confVarInput.validator(org);
    expect(result).to.be.false;
    expect(spawnSyncStub.called).to.be.true;
    expect(spawnSyncStub.getCall(0).args[1]).to.contain(org);
  });

  it('considers valid an authenticated org', async () => {
    const org = 'authenticated-org';
    const spawnSyncStub = sinon.stub().returns({
      status: SUCCESS_STATUS,
      stdout: '',
      pid: 0,
      output: [],
      stderr: '',
      signal: null,
    });

    const { default: configMeta } = await esmock('../src/configMeta.js', {
      'node:child_process': {
        default: { spawnSync: spawnSyncStub },
      },
    });

    const confVarInput = configMeta[0].input;
    const result = confVarInput.validator(org);
    expect(result).to.be.true;
    expect(spawnSyncStub.called).to.be.true;
    expect(spawnSyncStub.getCall(0).args[1]).to.contain(org);
  });

  it('returns the correct failed message', async () => {
    const { default: configMeta } = await esmock('../src/configMeta.js', {
      'node:child_process': {
        default: { spawnSync: sinon.stub() },
      },
    });

    const org = 'unauthenticated-org';
    const confVarInput = configMeta[0].input;
    expect(confVarInput.failedMessage(org)).to.equal(`org "${org}" is not authenticated`);
  });
});
