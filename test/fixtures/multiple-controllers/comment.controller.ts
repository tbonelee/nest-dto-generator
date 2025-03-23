import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('comments')
export class CommentController {
  @Get()
  findAll() {
    return [];
  }

  @Post()
  create(@Body() createCommentDto: CreateCommentDto) {
    return createCommentDto;
  }
}

class CreateCommentDto {
  content: string;
  postId: number;
}
