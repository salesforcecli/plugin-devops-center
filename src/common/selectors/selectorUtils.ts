/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { Connection, QueryResult, Record } from 'jsforce';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-devops-center', 'commonErrors');

export async function runSafeQuery<T extends Record>(con: Connection, queryStr: string): Promise<QueryResult<T>> {
  // Parameters verification
  if (!con) {
    throw messages.createError('error.connection-required');
  }
  if (typeof queryStr !== 'string' || queryStr.trim().length === 0) {
    throw messages.createError('error.query-string-required');
  }

  // Run the query and verify for results
  try {
    const result: QueryResult<T> = await con.query(queryStr);
    if (result.totalSize > 0 && result.records) {
      return result;
    }
  } catch (error) {
    throw messages.createError('error.query-failed');
  }

  // If we arrive here, it means the query has no results.
  throw messages.createError('error.no-results-found');
}
