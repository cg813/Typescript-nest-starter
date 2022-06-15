import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as sinon from 'sinon';

import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';

describe('Todo Controller', () => {
  let controller: TodoController;
  let todoService: { [key: string]: sinon.SinonSpy };

  beforeEach(async () => {
    todoService = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodoController],
      providers: [
        {
          provide: TodoService,
          useValue: todoService,
        },
      ],
    }).compile();

    controller = module.get<TodoController>(TodoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should throw a NotFoundException if the item cannot be found', async () => {
    todoService.getTodoById = sinon.fake.resolves(undefined);

    try {
      await controller.getTodo('foo');
      throw new Error('should not be thrown');
    } catch (err) {
      expect(err instanceof NotFoundException).toBe(true);
    }
  });
});
