/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export default function vacuum(str: unknown): string {
  return (str as string).trim().replace(/^ +/gm, '').replace(/ +$/gm, '').replace(/ +/gm, ' ');
}
