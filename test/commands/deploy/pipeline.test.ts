/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, test } from '@oclif/test';
import { TestContext } from '@salesforce/core/lib/testSetup';
import * as sinon from 'sinon';
import { ConfigAggregator, Org } from '@salesforce/core';
import { ConfigVars } from '../../../src/configMeta';
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
    sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
      value: 'TARGET_DEVOPS_CENTER_ALIAS',
      key: ConfigVars.TARGET_DEVOPS_CENTER,
      isLocal: () => false,
      isGlobal: () => true,
      isEnvVar: () => false,
    });
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

    test
      .do(() => {
        sandbox
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .stub(PromoteCommand.prototype, 'executePromotion' as any)
          .throwsException({ name: 'GenericTimeoutError' });
      })
      .stdout()
      .stderr()
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--wait=3'])
      .it('runs deploy:pipeline and handles a GenericTimeoutError', (ctx) => {
        expect(ctx.stderr).to.contain(
          'The command has timed out, although the deployment is still running. To check the status of the deploy operation, run "sf deploy pipeline report".'
        );
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
      .command(['deploy:pipeline', '-p=testProject', '-b=testBranch', '--async'])
      .it('cache the aorId when running deploy pipeline with the async flag', async () => {
        const cache = await DeployPipelineCache.create();
        const key = cache.resolveLatest();
        expect(key).not.to.be.undefined;
      });
  });
});
