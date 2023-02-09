/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import DOCeStreaming from './doceStream';

export default abstract class SObjectStreaming extends DOCeStreaming {
  private idstoInspect: string[];

  protected constructor(org: Org, wait: Duration, idsToInspect: string[]) {
    super(org, wait);
    this.idstoInspect = idsToInspect;
  }

  protected isValidIdToInspect(idToInspect: string): boolean {
    return this.idstoInspect.includes(idToInspect);
  }
}
