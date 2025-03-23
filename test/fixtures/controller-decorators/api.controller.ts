import { Controller, Get } from '@nestjs/common';

// No argument case
@Controller()
export class RootController {
  @Get()
  findAll() {
    return [];
  }
}

// String argument case
const API_PREFIX = 'api/v1';
@Controller(API_PREFIX)
export class ApiController {
  @Get()
  findAll() {
    return [];
  }
}

// Array argument case
@Controller(['v1', 'v2'])
export class VersionedController {
  @Get()
  findAll() {
    return [];
  }
}

// Options object case
@Controller({ path: 'options', host: 'example.com' })
export class OptionsController {
  @Get()
  findAll() {
    return [];
  }
}

// Mixed array case with literal and variable
const API_VERSION = 'v2';
@Controller(['api', API_VERSION])
export class MixedArrayController {
  @Get()
  findAll() {
    return [];
  }
}
