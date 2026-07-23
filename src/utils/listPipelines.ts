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

export type DevopsPipeline = {
  Id: string;
  Name: string;
  Description: string | null;
  IsActive: boolean;
};

export type PipelineListResult = {
  pipelines: DevopsPipeline[];
};

export async function listPipelines(connection: Connection): Promise<PipelineListResult> {
  const result = await connection.query<DevopsPipeline>('SELECT Id, Name, Description, IsActive FROM DevopsPipeline');
  return { pipelines: result.records ?? [] };
}
