/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AbstractAorOutputService, AorOutputFlags, AorOutputService } from './aorOutputService';

/* eslint-disable @typescript-eslint/no-empty-interface */

/**
 * Interface for output methods for resume operations
 *
 * @author JuanStenghele-sf
 */
export interface ResumeOutputService extends AorOutputService {}

export abstract class AbstractResumeOutputService<T extends AorOutputFlags>
  extends AbstractAorOutputService<T>
  implements ResumeOutputService {}
