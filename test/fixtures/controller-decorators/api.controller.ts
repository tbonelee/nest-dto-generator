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

// Options object case without path
@Controller({ host: 'example.com' })
export class NoPathOptionsController {
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

// Invalid cases (commented out for testing)
/*
// Invalid: empty array
@Controller([])
export class EmptyArrayController {}

// Invalid: non-string array element
@Controller([1, 'v1'])
export class NonStringArrayController {}

// Invalid: non-string path in options
@Controller({ path: 123 })
export class NonStringPathController {}

// Invalid: non-string variable
const INVALID_PREFIX = 123;
@Controller(INVALID_PREFIX)
export class NonStringVariableController {}
*/
