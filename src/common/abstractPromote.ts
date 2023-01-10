/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { fetchAndValidatePipelineStage, PipelineStage, PromotePipelineResult, TestLevel } from '../common';

export type PromoteFlags = {
  'branch-name': string;
  'bundle-version-name'?: string;
  'deploy-all'?: boolean;
  'devops-center-project-name': string;
  'devops-center-username': Org;
  'test-level'?: TestLevel;
  tests?: string[];
};

export abstract class PromoteCommand extends SfCommand<PromotePipelineResult> {
  protected targetStageId: string;

  protected async executePromotion(
    projectName: string,
    branchName: string,
    flags: Partial<PromoteFlags>
  ): Promise<PromotePipelineResult> {
    const doceOrg: Org = await Org.create({ aliasOrUsername: flags['devops-center-username']?.getUsername() });
    const pipelineStage: PipelineStage = await fetchAndValidatePipelineStage(doceOrg, projectName, branchName);
    this.computeTargetStageId(pipelineStage);

    // hardcoded value so it compiles until main logic is implemented
    return { status: 'status' };
  }

  /**
   * Knows how to compute the target pipeline stage Id based on the type of promotion.
   */
  protected abstract computeTargetStageId(pipelineStage: PipelineStage): void;
}
