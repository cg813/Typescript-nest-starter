import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { ConfigService } from 'src/config/config.service';
import { Connection, createConnection, QueryRunner } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export class TestDb {
  readonly dbName: string;
  private templateDbName: string;

  // These are set in create()
  private tables: string[] = [];
  private autoIncrements: Map<string, number> = new Map();

  /**
   * Factory method. Use instead of constructor.
   * All-in-one setup method, can be called directly in a describe() body.
   *
   * @param config Instance of application's Config
   * @param assignFn Function that can be passed to obtain the TestDb instance inside your test suite so you can can obtain the testDb name
   */
  static setup(config: ConfigService, assignFn?: (testDb: TestDb) => void): void {
    let _testDb: TestDb;

    beforeAll(async () => {
      _testDb = new this(config);
      if (assignFn) assignFn(_testDb);

      await _testDb.create();
    }, 30000);

    beforeEach(async () => {
      await _testDb.reset();
    });

    afterAll(async () => {
      await _testDb.teardown();
    });
  }

  /**
   * Constructor, should not be used. Use the static setup() method.
   * @param config
   */
  constructor(private readonly config: ConfigService) {
    this.dbName = 'test__' + Math.round(Math.random() * 1e9);
    this.templateDbName = this.dbName + '__template';
  }

  /**
   * Internal creation method
   */
  private async create(): Promise<void> {
    // Sadly, we can't initialize both NestApplications at the same time because
    // they both name their connection 'default'

    // Create the actual test database
    let app: INestApplication;
    let moduleFixture: TestingModule;

    await TestDb.createDb(this.config, this.dbName);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule.forE2E(this.dbName)],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const testConnection = app.get(Connection);
    await testConnection.runMigrations();

    await app.close();

    // Create the template database
    await TestDb.createDb(this.config, this.templateDbName);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule.forE2E(this.templateDbName)],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const templateConnection = app.get(Connection);
    await templateConnection.runMigrations();

    // Store the table names and AUTO_INCREMENT settings once so we don't
    // have to query them on every reset
    const tables = await templateConnection
      .query(`SHOW TABLES`)
      .then((rows: Array<Record<string, string>>) => rows.map(row => Object.values(row)[0]));

    const autoIncrements: Map<string, number> = new Map();
    for (const table of tables) {
      const autoIncrement = await templateConnection
        .query(
          `
            SELECT
              AUTO_INCREMENT
            FROM
              information_schema.TABLES
            WHERE
              TABLE_SCHEMA = "${this.templateDbName}"
              AND TABLE_NAME = "${table}"
          `,
        )
        .then(rows => rows[0].AUTO_INCREMENT);

      // null means no AUTO_INCREMENT on that table
      if (autoIncrement !== null) {
        autoIncrements.set(table, autoIncrement);
      }
    }

    await app.close();

    this.tables = tables;
    this.autoIncrements = autoIncrements;
  }

  /**
   * Teardown the test database, along with its template database.
   */
  async teardown(): Promise<void> {
    const queryRunner = await TestDb.createConnection(this.config, {
      name: this.dbName + '_close',
      dbName: this.dbName,
    });

    await queryRunner.dropDatabase(this.dbName);
    await queryRunner.dropDatabase(this.templateDbName);

    await TestDb.closeConnection(queryRunner);
  }

  /**
   * Reset the test database by copying the template database content. Resets
   * AUTO_INCREMENT fields.
   */
  async reset(): Promise<void> {
    const queryRunner = await TestDb.createConnection(this.config, {
      name: this.dbName + '_reset',
      dbName: this.dbName,
    });
    const connection = queryRunner.connection;

    await connection.query('SET FOREIGN_KEY_CHECKS=0;');

    // First, delete all contents from all tables in the database
    // After that, reset the AUTO_INCREMENT values to what they were after
    // executing the migrations.

    // This CANNOT be parallelized. It will throw foreign key constraints.
    // The reason for this is unknown. But it works this way, even if you
    // shuffle() the tables array.
    for (const table of this.tables) {
      // DELETE is MUCH faster than TRUNCATE or DROP+CREATE for tables with only
      // a small number of entries (10x faster), which we assume will be
      // the case for most, if not all, cases.
      // All methods reset AUTO_INCREMENT, so might as well use DELETE.
      // await connection.query(`DELETE FROM ${table}`);
      await connection.query(`DELETE FROM ${table}`);

      if (this.autoIncrements.has(table)) {
        // await connection.query(`
        await connection.query(`
          ALTER TABLE
            ${table}
          AUTO_INCREMENT = ${this.autoIncrements.get(table)}
        `);
      }
    }

    // Second, copy over all content from the template database.
    // This can be in parallel, though. MySQL FTW!
    await Promise.all(
      this.tables.map(table =>
        // connection.query(`
        connection.query(`
          INSERT INTO
            ${this.dbName}.${table}
          SELECT
            *
          FROM
            ${this.templateDbName}.${table}
        `),
      ),
    );

    await connection.query('SET FOREIGN_KEY_CHECKS=1;');
    await TestDb.closeConnection(queryRunner);
  }

  static async createConnection(
    config: ConfigService,
    { name, dbName }: { name?: string; dbName?: string } = {},
  ): Promise<QueryRunner> {
    const conn = await createConnection({
      name: name ? name : 'default',
      type: 'mysql',
      host: config.database.host,
      port: config.database.port,
      username: config.database.user,
      password: config.database.pass,
      database: dbName || config.database.name,
      ssl: config.database.ssl,
      namingStrategy: new SnakeNamingStrategy(),
    });

    return conn.createQueryRunner();
  }

  static async closeConnection(queryRunner: QueryRunner): Promise<void> {
    const conn = queryRunner.connection;
    await queryRunner.release();
    await conn.close();
  }

  static async createDb(config: ConfigService, dbName: string): Promise<void> {
    const queryRunner = await TestDb.createConnection(config);

    await queryRunner.createDatabase(dbName);

    await TestDb.closeConnection(queryRunner);
  }

  static async dropDb(config: ConfigService, dbName: string): Promise<void> {
    const queryRunner = await TestDb.createConnection(config);

    await queryRunner.dropDatabase(dbName);

    await TestDb.closeConnection(queryRunner);
  }
}
