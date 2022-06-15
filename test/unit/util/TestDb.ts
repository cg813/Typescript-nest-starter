import { ConfigService } from 'src/config/config.service';
import { ENTITIES_PATHS, MIGRATION_PATH, MIGRATION_TABLE_NAME } from 'src/definitions';
import { Connection, createConnection } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

interface TestDbOptions {
  reset?: boolean;
}

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
   * @param options Options parameter
   * @param options.reset Use to disable resetting between tests. Note that this completely disables the templating mechanism.
   */
  static setup(
    config: ConfigService,
    assignFn?: (testDb: TestDb) => void,
    options: TestDbOptions = {},
  ): void {
    options = this.normalizeOptions(options);
    let _testDb: TestDb;

    beforeAll(async () => {
      _testDb = new this(config, options);
      if (assignFn) assignFn(_testDb);

      await _testDb.create();
    }, 30000);

    beforeEach(async () => {
      if (options.reset) {
        await _testDb.reset();
      }
    });

    afterAll(async () => {
      await _testDb.teardown();
    });
  }

  /**
   * Constructor, should not be used. Use the static setup() method.
   * @param config
   */
  constructor(
    private readonly config: ConfigService,
    private readonly options: TestDbOptions = {},
  ) {
    options = TestDb.normalizeOptions(options);

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
    await TestDb.createDb(this.config, this.dbName);

    const testConnection = await TestDb.createConnection(this.config, {
      dbName: this.dbName,
    });
    await testConnection.runMigrations();

    await TestDb.closeConnection(testConnection);

    // Create the template database, if required
    if (this.options.reset) {
      await TestDb.createDb(this.config, this.templateDbName);

      const templateConnection = await TestDb.createConnection(this.config, {
        dbName: this.templateDbName,
      });
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

      await TestDb.closeConnection(templateConnection);

      this.tables = tables;
      this.autoIncrements = autoIncrements;
    }
  }

  /**
   * Teardown the test database, along with its template database.
   */
  async teardown(): Promise<void> {
    const connection = await TestDb.createConnection(this.config, {
      name: this.dbName + '_close',
      dbName: this.dbName,
    });

    await connection.query(`DROP DATABASE ${this.dbName}`);
    if (this.options.reset) {
      await connection.query(`DROP DATABASE ${this.templateDbName}`);
    }

    await TestDb.closeConnection(connection);
  }

  /**
   * Reset the test database by copying the template database content. Resets
   * AUTO_INCREMENT fields.
   */
  async reset(): Promise<void> {
    if (!this.options.reset) {
      return;
    }

    const connection = await TestDb.createConnection(this.config, {
      name: this.dbName + '_reset',
      dbName: this.dbName,
    });

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
    await TestDb.closeConnection(connection);
  }

  static async createConnection(
    config: ConfigService,
    { name, dbName }: { name?: string; dbName?: string } = {},
  ): Promise<Connection> {
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
      entities: [...ENTITIES_PATHS],
      migrationsTableName: MIGRATION_TABLE_NAME,
      migrations: [MIGRATION_PATH],
    });

    return conn;
  }

  static async closeConnection(connection: Connection): Promise<void> {
    await connection.close();
  }

  static async createDb(config: ConfigService, dbName: string): Promise<void> {
    const connection = await TestDb.createConnection(config);

    await connection.query(`CREATE DATABASE ${dbName}`);

    await TestDb.closeConnection(connection);
  }

  static async dropDb(config: ConfigService, dbName: string): Promise<void> {
    const connection = await TestDb.createConnection(config);

    await connection.query(`DROP DATABASE ${dbName}`);

    await TestDb.closeConnection(connection);
  }

  private static normalizeOptions(options?: TestDbOptions): TestDbOptions {
    return Object.assign(
      {
        reset: true,
      },
      options || {},
    );
  }
}
