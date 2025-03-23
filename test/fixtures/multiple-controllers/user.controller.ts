import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Get()
  findAll() {
    return [];
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return createUserDto;
  }
}

class CreateUserDto {
  name: string;
  email: string;
}
