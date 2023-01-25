/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, test } from '@oclif/test';
import { TestContext } from '@salesforce/core/lib/testSetup';
import * as sinon from 'sinon';
import { Org } from '@salesforce/core';
import { PromoteCommand } from '../../../src/common/abstractPromote';
import { DeployPipelineCache } from '../../../src/common/deployPipelineCache';

const DOCE_ORG = {
  id: '1',
  getOrgId() {
    return '1';
  },
  getAlias() {
    return ['doceOrg'];
  },
};

describe('deploy pipeline', () => {
  let sandbox: sinon.SinonSandbox;
  let executeCommandStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(Org, 'create' as any).returns(DOCE_ORG);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validate flags', () => {
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
          expect(ctx.stderr).to.contain('runTests can be used only with a testLevel of RunSpecifiedTests.');
        }
      );

    test
      .stdout()
      .stderr()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        executeCommandStub = sandbox.stub(PromoteCommand.prototype, 'executePromotion' as any);
      })
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-l=RunSpecifiedTests', '-t=DummyTestClass'])
      .it('runs deploy pipeline with the correct flags and validation pass', (ctx) => {
        expect(ctx.stderr).to.equal('');
        expect(executeCommandStub.called).to.equal(true);
      });
  });

  describe('cache', () => {
    const $$ = new TestContext();

    beforeEach(async () => {
      // Mock the cache
      $$.setConfigStubContents('DeployPipelineCache', {});
    });

    test
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch'])
      .it('does not cache when running deploy pipeline without the async flag', async () => {
        const cache = await DeployPipelineCache.create();
        let excThrown = false;
        try {
          cache.resolveLatest();
        } catch (err) {
          excThrown = true;
        }
        expect(excThrown);
      });

    test
      .stdout()
      .stderr()
      .do(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        executeCommandStub = sandbox.stub(PromoteCommand.prototype, 'executePromotion' as any);
      })
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '-c=doceOrg', '--async'])
      .it('cache the aorId when running deploy pipeline with the async flag', async () => {
        const cache = await DeployPipelineCache.create();
        const key = cache.resolveLatest();
        expect(key).not.to.be.undefined;
      });
  });
});
