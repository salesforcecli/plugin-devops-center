/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { bold } from 'chalk';
import { Messages, Org } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Duration } from '@salesforce/kit';
import { PromotePipelineResult } from '../../../common';
import AsyncOpStreaming from '../../../streamer/processors/asyncOpStream';
import { requiredDoceOrgFlag } from '../../../common/flags';
import { DeployPipelineCache } from '../../../common/deployPipelineCache';
import { isNotResumable } from '../../../common/abstractPromote';
import { AsyncOperationResult } from '../../../common/types';
import { getAsyncOperationResult } from '../../../common/utils';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.pipeline.resume');

export default class DeployPipelineResume extends SfCommand<PromotePipelineResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';

  public static readonly flags = {
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      exclusive: ['verbose'],
    }),
    'devops-center-username': requiredDoceOrgFlag(),
    'job-id': Flags.salesforceId({
      char: 'i',
      startsWith: '0Af',
      description: messages.getMessage('flags.job-id.description'),
      summary: messages.getMessage('flags.job-id.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    'use-most-recent': Flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.use-most-recent.description'),
      summary: messages.getMessage('flags.use-most-recent.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
      exclusive: ['concise'],
    }),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      unit: 'minutes',
      helpValue: '<minutes>',
      min: 3,
      defaultValue: 33,
    }),
  };

  public async run(): Promise<PromotePipelineResult> {
    const { flags } = await this.parse(DeployPipelineResume);
    const doceOrg: Org = flags['devops-center-username'] as Org;
    // const cache = await DeployPipelineCache.create();
    const asyncJobId = (await DeployPipelineCache.create()).resolveLatest(flags['use-most-recent'], flags['job-id']);
    const asyncJob: AsyncOperationResult = await getAsyncOperationResult(doceOrg.getConnection(), asyncJobId);

    if (isNotResumable(asyncJob.sf_devops__Status__c)) {
      throw messages.createError('error.DeployNotResumable', [asyncJobId, asyncJob.sf_devops__Status__c]);
    }

    this.log('*** Resuming Deployment ***');
    this.log(`Deploy ID: ${bold(asyncJobId)}`);
    // new DeployProgress(deploy, this.jsonEnabled()).start();

    // const result = await deploy.pollStatus(500, wait.seconds);
    // process.exitCode = determineExitCode(result);

    // const formatter = new DeployResultFormatter(result, {
    //   ...flags,
    //   verbose: deployOpts.verbose,
    //   concise: deployOpts.concise,
    // });

    const streamer: AsyncOpStreaming = new AsyncOpStreaming(doceOrg, flags.wait as Duration, asyncJobId);
    await streamer.startStreaming();
    return { jobId: '' };
  }
}

// TODO:
// Job ID 0AfDS00002pON6B0AW is not resumable with status Succeeded.
