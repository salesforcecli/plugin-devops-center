/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable no-console, class-methods-use-this , no-case-declarations */

import { Connection } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Flags } from '../base/abstractPromote';
import { DeploySummaryBuilder } from './deploySummaryBuilder';
import { AbstractPromoteOutputService } from './promoteOutputService';

/**
 * Service class to print the deploy output
 *
 * @author JuanStenghele-sf
 */
export class DeployCommandOutputService extends AbstractPromoteOutputService {
  public constructor(flags: Partial<Flags<typeof SfCommand>>, con: Connection, branchName?: string) {
    super(
      {
        async: flags['async'],
        branch: branchName ? branchName : (flags['branch-name'] as string),
        concise: flags['concise'],
        verbose: flags['verbose'],
      },
      new DeploySummaryBuilder(con),
      con
    );
  }
}
