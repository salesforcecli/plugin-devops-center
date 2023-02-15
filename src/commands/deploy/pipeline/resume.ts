/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { bold } from 'chalk';
import { Messages, Org, SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { PromotePipelineResult } from '../../../common';
import AsyncOpStreaming from '../../../streamer/processors/asyncOpStream';
import { jobId, requiredDoceOrgFlag, useMostRecent, wait } from '../../../common/flags';
import { DeployPipelineCache } from '../../../common/deployPipelineCache';
import { isNotResumable } from '../../../common/abstractPromote';
import { AsyncOperationResult } from '../../../common/types';
import { getAsyncOperationResult } from '../../../common/utils';
import DoceMonitor from '../../../streamer/doceMonitor';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'deploy.pipeline.resume');

export default class DeployPipelineResume extends SfCommand<PromotePipelineResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';

  public static readonly flags = {
    'devops-center-username': requiredDoceOrgFlag(),
    'job-id': jobId,
    'use-most-recent': useMostRecent,
    wait,
  };

  public async run(): Promise<PromotePipelineResult> {
    const { flags } = await this.parse(DeployPipelineResume);
    const asyncJobId = (await DeployPipelineCache.create()).resolveLatest(flags['use-most-recent'], flags['job-id']);

    // get the latest state of the async job and validate that it's resumable
    const doceOrg: Org = flags['devops-center-username'] as Org;
    const asyncJob: AsyncOperationResult = await getAsyncOperationResult(doceOrg.getConnection(), asyncJobId);
    if (isNotResumable(asyncJob.sf_devops__Status__c)) {
      throw messages.createError('error.DeployNotResumable', [asyncJobId, asyncJob.sf_devops__Status__c]);
    }

    this.log('*** Resuming Deployment ***');
    this.log(`Deploy ID: ${bold(asyncJobId)}`);
    const streamer: DoceMonitor = new AsyncOpStreaming(doceOrg, flags.wait, asyncJobId);
    await streamer.monitor();

    return { jobId: asyncJobId };
  }

  protected catch(error: Error | SfError): Promise<SfCommand.Error> {
    if (error.name.includes('GenericTimeoutError')) {
      const err = messages.createError('error.ClientTimeout');
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }
}
