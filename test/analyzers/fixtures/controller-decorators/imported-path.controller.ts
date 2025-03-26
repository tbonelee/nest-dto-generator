import { Controller } from '@nestjs/common';
import { API_PREFIX, API_VERSION, PATHS, CONTROLLER_CONFIG } from './constants';

@Controller([API_PREFIX, API_VERSION])
export class ImportedPathArrayController {}

@Controller(API_PREFIX)
export class ImportedPathStringController {}

@Controller(PATHS)
export class ImportedPathsArrayController {}

@Controller(CONTROLLER_CONFIG)
export class ImportedConfigController {}
