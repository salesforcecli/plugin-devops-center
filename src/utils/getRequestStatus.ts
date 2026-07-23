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

import { Connection } from '@salesforce/core';
import { escapeSOQL } from './soqlUtils.js';

export type RequestStatusResult = {
  id: string;
  status: string;
  message: string | null;
  errorDetails: string | null;
  requestToken: string;
  requestCompletionDate: string | null;
};

type DevopsRequestInfoRecord = {
  Id: string;
  Status: string;
  Message: string | null;
  ErrorDetails: string | null;
  RequestToken: string;
  RequestCompletionDate: string | null;
};

export async function getRequestStatus(connection: Connection, requestToken: string): Promise<RequestStatusResult> {
  const result = await connection.query<DevopsRequestInfoRecord>(
    `SELECT Id, Status, Message, ErrorDetails, RequestToken, RequestCompletionDate FROM DevopsRequestInfo WHERE RequestToken = '${escapeSOQL(
      requestToken
    )}' LIMIT 1`
  );

  const record = (result.records ?? [])[0];
  if (!record) {
    throw new Error(`RequestNotFound:${requestToken}`);
  }

  return {
    id: record.Id,
    status: record.Status,
    message: record.Message,
    errorDetails: record.ErrorDetails,
    requestToken: record.RequestToken,
    requestCompletionDate: record.RequestCompletionDate,
  };
}
