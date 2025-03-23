#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';

const program = new Command();

program
  .name('nest-dto-generator')
  .description('NestJS DTO 생성기')
  .version(version);

program.parse();

console.log('Happy developing ✨');
