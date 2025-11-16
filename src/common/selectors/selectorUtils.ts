/*
 * Copyright 2025, Salesforce, Inc.
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

import { Messages, Connection } from '@salesforce/core';
import { QueryResult, Record } from 'jsforce';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export async function runSafeQuery<T extends Record>(
  con: Connection,
  queryStr: string,
  allowNullResults = false
): Promise<QueryResult<T>> {
  // Parameters verification
  if (!con) {
    throw messages.createError('error.connection-required');
  }
  if (typeof queryStr !== 'string' || queryStr.trim().length === 0) {
    throw messages.createError('error.query-string-required');
  }

  // Run the query and verify for results
  try {
    // We query for 10000 results and we use autoFetch to queryMore automatically.
    const result: QueryResult<T> = await con.query(queryStr, { autoFetch: true, maxFetch: 10_000 });
    if ((result.totalSize > 0 && result.records) || (result.totalSize === 0 && allowNullResults)) {
      return result;
    }
  } catch (error) {
    throw messages.createError('error.query-failed', [(error as Error).name]);
  }

  // If we arrive here, it means the query has no results.
  throw messages.createError('error.no-results-found');
}
