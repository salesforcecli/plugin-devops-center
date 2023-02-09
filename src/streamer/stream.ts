/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { StatusResult } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';

export default interface Stream {
  /**
   *
   * @param event The CDC event we want to inspect
   * @param processor The processor that will handle the event
   */
  startStream(event: string, processor: (message: JsonMap) => StatusResult): Promise<void | AnyJson>;
}
