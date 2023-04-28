/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export const APPROVED = 'Approved';
export const ASYNC_OPERATION_CDC = '/data/Async_Operation_Result__ChangeEvent';
export const REST_PROMOTE_BASE_URL = '/services/apexrest/sf_devops/pipeline/promote/v1/';
export const HTTP_CONFLICT_CODE = 'CONFLICT';
export enum AsyncOperationType {
  AD_HOC_PROMOTE = 'AD_HOC_PROMOTE',
  VERSIONED_PROMOTE = 'VERSIONED_PROMOTE',
  SOUP_PROMOTE = 'SOUP_PROMOTE',
  CHECK_DEPLOY = 'CHECK_DEPLOY',
}
