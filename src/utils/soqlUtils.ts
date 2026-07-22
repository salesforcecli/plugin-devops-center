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

/**
 * Escapes single quotes in a string for safe use in SOQL queries.
 * Use this for user-supplied string values like names.
 */
export function escapeSOQL(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Validates that a string is a properly formatted Salesforce ID (15 or 18 characters, alphanumeric).
 * Throws an error if validation fails.
 * Use this before interpolating IDs into SOQL queries.
 */
export function validateSalesforceId(id: string, context?: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error(`Invalid Salesforce ID${context ? ` for ${context}` : ''}: value is empty or not a string`);
  }
  if (!/^[a-zA-Z0-9]{15,18}$/.test(id)) {
    throw new Error(
      `Invalid Salesforce ID format${
        context ? ` for ${context}` : ''
      }: "${id}". Expected 15-18 alphanumeric characters.`
    );
  }
  return id;
}

/**
 * Validates that a string starts with the expected Salesforce object prefix.
 * Throws an error if validation fails.
 */
export function validateSalesforceIdPrefix(id: string, expectedPrefix: string, objectType: string): string {
  validateSalesforceId(id, objectType);
  if (!id.startsWith(expectedPrefix)) {
    throw new Error(`Invalid ${objectType} ID: "${id}". Expected ID to start with "${expectedPrefix}".`);
  }
  return id;
}

/**
 * Validates an array of Salesforce IDs.
 * Throws an error if any ID is invalid.
 */
export function validateSalesforceIds(ids: string[], context?: string): string[] {
  if (!Array.isArray(ids)) {
    throw new Error(`Invalid ID array${context ? ` for ${context}` : ''}: not an array`);
  }
  return ids.map((id, index) => validateSalesforceId(id, `${context ?? 'array'}[${index}]`));
}
