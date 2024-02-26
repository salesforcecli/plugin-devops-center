/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
