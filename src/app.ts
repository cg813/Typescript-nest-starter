/* eslint-disable no-console */ // We don't have a logger available everywhere in this file.

import { LogService } from '@elunic/logger';
import { LOGGER } from '@elunic/logger-nestjs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require(process.cwd() + '/package.json');

console.log(`${new Date().toISOString()} Starting up`);
console.log(
  `${new Date().toISOString()} NODE_ENV=${process.env.NODE_ENV}`,
  `LOG_LEVEL=${process.env.LOG_LEVEL}`,
);

(async (): Promise<void> => {
  const app = await NestFactory.create(AppModule.forApp());

  // NOTE: ValidationPipe/class-validator are NOT used because their handling
  // and capabilities are very limited compared to Joi/JoiPipe, especially
  // concerning automagic value transformation.

  const configService = app.get<ConfigService>('ConfigService');
  const logService = app.get<LogService>(LOGGER);

  SwaggerModule.setup(
    '/api/docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle(packageJson.name)
        .setDescription('API documentation of all integrated modules')
        .setVersion(packageJson.version)
        .build(),
    ),
  );

  await app.listen(configService.httpPort);
  logService.info(`Listening on port ${configService.httpPort}`);
})().catch(err => {
  console.error(`${new Date().toISOString()} Fatal error during startup`, err);
  process.exit(1);
});
