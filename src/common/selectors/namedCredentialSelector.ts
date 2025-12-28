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

import { QueryResult } from 'jsforce';
import { Connection } from '@salesforce/core';
import { NamedCredential } from '../types';
import { runSafeQuery } from './selectorUtils';

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

  const resp: QueryResult<NamedCredential> = await runSafeQuery(con, queryStr);
  return resp.records[0];
}
