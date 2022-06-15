import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as moment from 'moment';
import { AppModule } from 'src/app.module';
import { ConfigService } from 'src/config/config.service';
import { TodoEntity } from 'src/todo/todo.entity';
import * as request from 'supertest';
import { TestDb } from 'test/e2e/util/TestDb';
import { Connection, getConnection, Repository } from 'typeorm';

describe('TodoController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let todoRepo: Repository<TodoEntity>;

  let testDb: TestDb;
  TestDb.setup(new ConfigService(), t => (testDb = t));

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule.forE2E(testDb.dbName)],
    }).compile();

    connection = getConnection();

    todoRepo = connection.getRepository(TodoEntity);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /todo/:todoId', () => {
    let insertedTodo: TodoEntity;

    beforeEach(async () => {
      insertedTodo = await todoRepo.save({
        title: 'title',
        description: 'description',
        dueDate: moment().add(1, 'd').toISOString(),
      });
    });

    it('should return 200', async () => {
      return request(app.getHttpServer())
        .get('/todos/' + insertedTodo.id)
        .expect(200);
    });

    it('should return a dataresponse containing the todo', async () => {
      return request(app.getHttpServer())
        .get('/todos/' + insertedTodo.id)
        .expect(response => {
          expect(response.body).toMatchObject({
            data: expect.objectContaining({
              title: 'title',
              description: 'description',
              dueDate: moment.utc(insertedTodo.dueDate).toISOString(),
            }),
          });
        });
    });
  });
});
