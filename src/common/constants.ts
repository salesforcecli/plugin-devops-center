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

export const APPROVED = 'Approved';
export const ASYNC_OPERATION_CDC = '/data/sf_devops__Async_Operation_Result__ChangeEvent';
export const REST_PROMOTE_BASE_URL = '/services/apexrest/sf_devops/pipeline/promote/v1/';
export const HTTP_CONFLICT_CODE = 'CONFLICT';
export enum AsyncOperationType {
  AD_HOC_PROMOTE = 'AD_HOC_PROMOTE',
  VERSIONED_PROMOTE = 'VERSIONED_PROMOTE',
  SOUP_PROMOTE = 'SOUP_PROMOTE',
  CHECK_DEPLOY = 'CHECK_DEPLOY',
}
