import { Controller, Get } from '@nestjs/common';

const API_PREFIX = 'api/v1';

@Controller(API_PREFIX)
export class ApiController {
  @Get()
  findAll() {
    return [];
  }
}
