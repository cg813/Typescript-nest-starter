import { LogService } from '@elunic/logger';
import { InjectLogger } from '@elunic/logger-nestjs';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection, EntityManager, Like } from 'typeorm';

import { CreateTodoDto } from './dto/CreateTodoDto';
import { TodoEntity } from './todo.entity';

@Injectable()
export class TodoService {
  constructor(
    @InjectLogger(TodoService.name) private readonly logger: LogService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // Demonstrates how to get a repository from the connection
  async getTodoById(id: string): Promise<TodoEntity | undefined> {
    const todoRepo = this.connection.getRepository<TodoEntity>(TodoEntity);

    const todo = await todoRepo.findOne(id);
    if (todo) {
      return todo;
    } else {
      return undefined;
    }
  }

  // Demonstrates how to use a transaction
  async createTodo(createData: CreateTodoDto): Promise<TodoEntity> {
    return await this.connection.transaction(async (entityManager: EntityManager) => {
      const todoRepo = entityManager.getRepository(TodoEntity);

      return await todoRepo.save(
        {
          title: createData.title,
          description: createData.description,
          dueDate: createData.dueDate,
        },
        {
          // This makes sure we get the actual instance from the database back
          reload: true,
        },
      );
    });
  }

  // Demonstrates how to use the connection queryBuilder
  async getTodosByTitle(partialTitle: string): Promise<TodoEntity[]> {
    return this.connection
      .createQueryBuilder()
      .select('todo')
      .from(TodoEntity, 'todo')
      .where({
        title: Like('%' + partialTitle + '%'),
      })
      .getMany();
  }

  // Demonstrates how to use transactions
  async importTodos(todos: TodoEntity[]): Promise<TodoEntity[]> {
    return await this.connection.transaction(async (entityManager: EntityManager) => {
      // Use the transaction's entity manager for this!
      const todoRepo = entityManager.getRepository<TodoEntity>(TodoEntity);

      const newIds = todos.map(todo => todo.id);

      // For import purposes, it might make sense to delete all and just re-write.
      // This is a demonstration of transactions, which isolate these two steps.
      // (doing this might not make sense in your case - it's a DEMO)
      await todoRepo.delete(newIds);
      await todoRepo.save(todos);

      return todoRepo.findByIds(newIds);
    });
  }
}
