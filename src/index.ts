#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { generateCommand } from './commands/generate';

const program = new Command();

program
  .name('nest-dto-generator')
  .description('NestJS DTO 생성기')
  .version(version);

program
  .command('generate')
  .description('Generate DTOs')
  .action(generateCommand);

program.parse();
