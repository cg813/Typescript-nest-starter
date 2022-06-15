import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HelloWorldController } from './hello-world/hello-world.controller';
import { ResponseInterceptor } from './lib/data-response';
import { HttpExceptionFilter } from './lib/filters/http-exceptions.filter';
import { TodoController } from './todo/todo.controller';
import { TodoEntity } from './todo/todo.entity';
import { TodoService } from './todo/todo.service';

@Module({
  imports: [TypeOrmModule.forFeature([TodoEntity])],
  controllers: [TodoController, HelloWorldController],
  providers: [
    TodoService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class TypescriptStarterModule {}
