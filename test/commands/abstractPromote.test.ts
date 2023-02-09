/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@oclif/test';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { SfError } from '@salesforce/core';
import { PromoteCommand } from '../../src/common/abstractPromote';
import { PipelineStage, PromotePipelineResult } from '../../src/common';

describe('DOCeStreaming', () => {
  test.it('Handles a GenericTimeoutError', () => {
    const instance = new PromoteCommandTest();
    try {
      instance.catchError(new SfError('Error message', 'GenericTimeoutError'));
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(error.message).to.contain(
        'The client has timed out. Use the corresponding report command to resume watching this operation.'
      );
    }
  });

  test.it('Handles other errors', () => {
    const instance = new PromoteCommandTest();
    try {
      instance.catchError(new SfError('Generic error message', 'Other error'));
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(error.message).to.contain('Generic error message');
    }
  });
});

class PromoteCommandTest extends PromoteCommand<typeof SfCommand> {
  public constructor() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    super([]);
  }

  // eslint-disable-next-line class-methods-use-this
  public catchError(error: Error): void {
    super.catch(error);
  }

  // eslint-disable-next-line class-methods-use-this
  public async run(): Promise<PromotePipelineResult> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this
  protected computeTargetStageId(pipelineStage: PipelineStage): void {}
}
