/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags, Interfaces } from '@oclif/core';
import { fetchAndValidatePipelineStage, PipelineStage, PromotePipelineResult, validateTestFlags } from '../common';
import {
  branchName,
  bundleVersionName,
  deployAll,
  devopsCenterProjectName,
  requiredDoceOrgFlag,
  specificTests,
  testLevel,
  async,
} from '../common/flags';

export type Flags<T extends typeof SfCommand> = Interfaces.InferredFlags<
  typeof PromoteCommand['globalFlags'] & T['flags']
>;

export abstract class PromoteCommand<T extends typeof SfCommand> extends SfCommand<PromotePipelineResult> {
  // common flags that can be inherited by any command that extends PromoteCommand
  public static globalFlags = {
    'branch-name': branchName,
    'bundle-version-name': bundleVersionName,
    'deploy-all': deployAll,
    'devops-center-project-name': devopsCenterProjectName,
    'devops-center-username': requiredDoceOrgFlag(),
    tests: specificTests,
    'test-level': testLevel(),
    async,
  };
  protected flags!: Flags<T>;
  protected targetStageId: string;

  public async init(): Promise<void> {
    await super.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { flags } = await this.parse(this.constructor as Interfaces.Command.Class);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.flags = flags;
  }

  protected async executePromotion(): Promise<PromotePipelineResult> {
    validateTestFlags(this.flags['test-level'], this.flags.tests);
    const doceOrg: Org = await Org.create({ aliasOrUsername: this.flags['devops-center-username']?.getUsername() });
    const pipelineStage: PipelineStage = await fetchAndValidatePipelineStage(
      doceOrg,
      this.flags['devops-center-project-name'],
      this.flags['branch-name']
    );
    this.computeTargetStageId(pipelineStage);

    // hardcoded value so it compiles until main logic is implemented
    return { status: 'status' };
  }

  /**
   * Knows how to compute the target pipeline stage Id based on the type of promotion.
   */
  protected abstract computeTargetStageId(pipelineStage: PipelineStage): void;
}
