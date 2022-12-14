/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, test } from '@oclif/test';
import * as sinon from 'sinon';
import { Org } from '@salesforce/core';

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getAlias() {
    return ['doceOrg'];
  },
};

describe('validate flags', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(DOCE_ORG);
  });

  afterEach(() => {
    sandbox.restore();
  });
  test
    .stdout()
    .stderr()
    .command(['deploy:pipeline', '--branch-name=test'])
    .it('runs deploy pipeline with no provided project name', (ctx) => {
      expect(ctx.stderr).to.contain('Missing required flag devops-center-project-name');
    });

  test
    .stdout()
    .stderr()
    .command(['deploy:pipeline', '--devops-center-project-name=test'])
    .it('runs deploy pipeline with no provided branch name', (ctx) => {
      expect(ctx.stderr).to.contain('Missing required flag branch-name');
    });

  test
    .stdout()
    .stderr()
    .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests'])
    .it(
      'runs deploy pipeline with test level RunSpecifiedTests but does not indicate specific tests with flag -t',
      (ctx) => {
        expect(ctx.stderr).to.contain(
          'You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.'
        );
      }
    );

  test
    .stdout()
    .stderr()
    .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-l=RunLocalTests', '-t=DummyTestClass'])
    .it(
      'runs deploy pipeline indicating specific tests to run but with test level other than RunSpecifiedTests',
      (ctx) => {
        expect(ctx.stderr).to.contain('runTests can only be used with a testLevel of RunSpecifiedTests.');
      }
    );

  test
    .stdout()
    .stderr()
    .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests', '-t=DummyTestClass'])
    .it('runs deploy pipeline with the correct flags and validation pass', (ctx) => {
      expect(ctx.stderr).to.equal('');
    });
});
