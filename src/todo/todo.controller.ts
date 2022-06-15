import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiNotFoundResponse, ApiResponse } from '@nestjs/swagger';

import {
  asResponse,
  DataResponse,
  getErrorResponseFor,
  getResponseFor,
} from '../lib/data-response';
import { ParseIdPipe } from '../lib/pipes/parse-id.pipe';
import { PostTodoRequestDto } from './dto/PostTodoRequestDto';
import { TodoEntity, TodoId } from './todo.entity';
import { TodoService } from './todo.service';

@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get('/:todoId')
  @ApiResponse({ type: getResponseFor(TodoEntity) })
  @ApiNotFoundResponse({ description: 'Not found', type: getErrorResponseFor(404) })
  async getTodo(
    @Param('todoId', new ParseIdPipe()) todoId: TodoId,
  ): Promise<DataResponse<TodoEntity>> {
    const todo = await this.todoService.getTodoById(todoId);

    if (!todo) {
      throw new NotFoundException(`Todo '${todoId}' not found`);
    }

    return asResponse(todo);
  }

  @Post('/')
  @ApiResponse({ type: getResponseFor(TodoEntity) })
  async postTodo(@Body() postTodoDto: PostTodoRequestDto): Promise<DataResponse<TodoEntity>> {
    const todo = await this.todoService.createTodo({
      title: postTodoDto.title,
      description: postTodoDto.description,
      dueDate: postTodoDto.dueDate,
    });

    return asResponse(todo);
  }
}
