/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { Parser } from '@oclif/core';
import { ConfigAggregator, Org } from '@salesforce/core';
import { ConfigVars } from '../../src/configMeta';
import { requiredDoceOrgFlag } from '../../src/common/flags';

const TARGET_DEVOPS_CENTER_ALIAS = 'target-devops-center';
const MOCK_TARGET_DEVOPS_CENTER = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getAlias(): string {
    return TARGET_DEVOPS_CENTER_ALIAS;
  },
};
const MOCK_DOCE_ORG = {
  id: '2',
  getOrgId() {
    return '2';
  },
  getAlias() {
    return 'doce-org';
  },
};

describe('requiredDoceOrgFlag', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns the org that corresponds to the alias set in --target-devops-center config variable', async () => {
    sandbox
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .stub(Org, 'create' as any)
      .withArgs({ aliasOrUsername: MOCK_TARGET_DEVOPS_CENTER.getAlias() })
      .returns(MOCK_TARGET_DEVOPS_CENTER)
      .withArgs({ aliasOrUsername: MOCK_DOCE_ORG.getAlias() })
      .returns(MOCK_DOCE_ORG);

    // mock config var --target-devops-center
    sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
      value: TARGET_DEVOPS_CENTER_ALIAS,
      key: ConfigVars.TARGET_DEVOPS_CENTER,
      isLocal: () => false,
      isGlobal: () => true,
      isEnvVar: () => false,
    });

    // value for the flag is not provided
    const out = await Parser.parse(['--requiredDoceOrg='], {
      flags: { requiredDoceOrg: requiredDoceOrgFlag() },
    });

    expect(out.flags.requiredDoceOrg).to.deep.equal(MOCK_TARGET_DEVOPS_CENTER);
  });

  it('returns the org that correpsonds to the alias provided and that overides the --target-devops-center org', async () => {
    sandbox
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .stub(Org, 'create' as any)
      .withArgs({ aliasOrUsername: MOCK_TARGET_DEVOPS_CENTER.getAlias() })
      .returns(MOCK_TARGET_DEVOPS_CENTER)
      .withArgs({ aliasOrUsername: MOCK_DOCE_ORG.getAlias() })
      .returns(MOCK_DOCE_ORG);

    // mock config var --target-devops-center
    sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
      value: TARGET_DEVOPS_CENTER_ALIAS,
      key: ConfigVars.TARGET_DEVOPS_CENTER,
      isLocal: () => false,
      isGlobal: () => true,
      isEnvVar: () => false,
    });

    const out = await Parser.parse([`--requiredDoceOrg=${MOCK_DOCE_ORG.getAlias()}`], {
      flags: { requiredDoceOrg: requiredDoceOrgFlag() },
    });

    expect(out.flags.requiredDoceOrg).to.deep.equal(MOCK_DOCE_ORG);
  });

  it('fails when no value is provided and the --target-devops-center config var is not set', async () => {
    sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
      value: null,
      key: ConfigVars.TARGET_DEVOPS_CENTER,
      isLocal: () => false,
      isGlobal: () => true,
      isEnvVar: () => false,
    });
    try {
      await Parser.parse(['--requiredDoceOrg='], {
        flags: { requiredDoceOrg: requiredDoceOrgFlag() },
      });
      assert.fail('This should have failed');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.message).to.include(
        'You must specify the DevOps Center org username by indicating the -c flag on the command line or by setting the --target-devops-center configuration variable.'
      );
    }
  });

  it('fails when an invalid alias is provided and the --target-devops-center config var is not set', async () => {
    const invalidAlias = 'invalidAlias';
    sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
      value: null,
      key: ConfigVars.TARGET_DEVOPS_CENTER,
      isLocal: () => false,
      isGlobal: () => true,
      isEnvVar: () => false,
    });
    try {
      await Parser.parse([`--requiredDoceOrg=${invalidAlias}`], {
        flags: { requiredDoceOrg: requiredDoceOrgFlag() },
      });
      assert.fail('This should have failed');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.message).to.include(`No authorization information found for ${invalidAlias}`);
    }
  });
});
