import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('posts')
export class PostController {
  @Get()
  findAll() {
    return [];
  }

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return createPostDto;
  }
}

class CreatePostDto {
  title: string;
  content: string;
}
