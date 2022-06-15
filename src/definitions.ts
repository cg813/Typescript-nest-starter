import * as path from 'path';

export const TABLE_PREFIX = '___CHANGEME____';
export const MIGRATION_TABLE_NAME = TABLE_PREFIX + '__migrations';
export const MIGRATION_PATH = path.join(__dirname + '/migrations/*.{ts,js}');
export const ENTITIES_PATHS = [
  // NOTE: If this creates dependency loops, you will have to manually specify the
  // list of entity files in a way that prevents a loop from being created.
  path.join(__dirname + '/**/*.entity.{ts,js}'),
];
