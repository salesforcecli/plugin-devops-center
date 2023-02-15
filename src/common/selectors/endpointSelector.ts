/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { QueryResult } from 'jsforce';
import { Connection } from '@salesforce/core';

type OrgUrlQueryResult = {
  Endpoint: string;
};

/**
 * Given a named credential it returns the org url (endpoint) associated with it
 */
export async function selectOrgUrl(con: Connection, namedCredential: string): Promise<string> {
  const queryStr = `
    SELECT Endpoint
    FROM NamedCredential
    WHERE DeveloperName = '${namedCredential}'
    AND NamespacePrefix = 'sf_devops'
    LIMIT 1`;
  const resp: QueryResult<OrgUrlQueryResult> = await con.query(queryStr);
  return resp.records[0].Endpoint;
}
