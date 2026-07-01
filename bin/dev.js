#!/usr/bin/env node

import { execute, settings } from '@oclif/core';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const project = join(__dirname, '..', 'tsconfig.json');

process.env.NODE_ENV = 'development';

settings.debug = true;

await execute({ development: true, dir: import.meta.url });
