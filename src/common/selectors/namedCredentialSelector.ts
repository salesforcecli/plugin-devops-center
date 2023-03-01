/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { QueryResult } from 'jsforce';
import { Connection } from '@salesforce/core';
import { NamedCredential } from '../types';

/**
 * Given a named credential it returns the org url (endpoint) associated with it
 */
export async function selectNamedCredentialByName(con: Connection, name: string): Promise<NamedCredential> {
  const queryStr = `
    SELECT Endpoint
    FROM NamedCredential
    WHERE DeveloperName = '${name}'
    AND NamespacePrefix = 'sf_devops'
    LIMIT 1`;
  const resp: QueryResult<NamedCredential> = await con.query(queryStr);
  return resp.records[0];
}
