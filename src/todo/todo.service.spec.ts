import { LogService } from '@elunic/logger';
import { MockLogService } from '@elunic/logger/mocks';
import { random, range } from 'lodash';
import { ConfigService } from 'src/config/config.service';
import { TestDb } from 'test/unit/util/TestDb';
import { Connection, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { TodoEntity } from './todo.entity';
import { TodoService } from './todo.service';

describe('TodoService', () => {
  let config: ConfigService;
  let mockLogger: MockLogService;

  let todoService: TodoService;

  let testDb: TestDb;
  TestDb.setup(new ConfigService(), t => (testDb = t), { reset: false });

  let connection: Connection;
  let todoRepo: Repository<TodoEntity>;

  let testTodos: TodoEntity[];
  const getRandomTodo = (): TodoEntity => testTodos[random(0, testTodos.length - 1)];

  beforeAll(async () => {
    config = new ConfigService();
    mockLogger = new MockLogService('test');
    connection = await TestDb.createConnection(config, { dbName: testDb.dbName });

    todoService = new TodoService((mockLogger as unknown) as LogService, connection);

    todoRepo = connection.getRepository(TodoEntity);
  });

  afterAll(async () => {
    await TestDb.closeConnection(connection);
  });

  beforeEach(async () => {
    testTodos = await todoRepo
      .save(
        range(5).map(index => ({
          title: 'Todo #' + index,
          description: 'Todo Description #' + index,
          dueDate: new Date().toISOString(),
        })),
      )
      .then(todos => todoRepo.findByIds(todos.map(todo => todo.id)));
  });

  afterEach(async () => {
    await todoRepo.delete({});
  });

  describe('createTodo()', () => {
    const CREATE_DATA = {
      title: uuidv4(),
      description: 'description',
      dueDate: new Date().toISOString(),
    };

    it('should save the todo to the database', async () => {
      await todoService.createTodo({
        ...CREATE_DATA,
      });

      const maybeTodo = await todoRepo.find({ title: CREATE_DATA.title });
      expect(maybeTodo.length).toBe(1);
    });

    it('should store the passed data correctly', async () => {
      await todoService.createTodo({
        ...CREATE_DATA,
      });

      const maybeTodo = await todoRepo.findOneOrFail({ title: CREATE_DATA.title });
      expect(maybeTodo).toMatchObject({
        ...CREATE_DATA,
      });
    });
  });

  describe('getTodoById()', () => {
    it('should fetch the todo with the specified ID', async () => {
      const testTodo = getRandomTodo();

      const maybeTodo = await todoService.getTodoById(testTodo.id);

      expect(maybeTodo).toMatchObject({
        id: testTodo.id,
        title: testTodo.title,
        description: testTodo.description,
        dueDate: testTodo.dueDate,
      });
    });
  });
});
