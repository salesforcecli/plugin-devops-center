/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AnyJson } from '@salesforce/ts-types';

/**
 * Common interface used to monitor the progress of something in the DevOps Center.
 **/
type DoceMonitor = {
  monitor(): Promise<void | AnyJson>;
}
export default DoceMonitor
