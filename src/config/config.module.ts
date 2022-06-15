import { Global, Module } from '@nestjs/common';

import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [ConfigService],
  controllers: [],
  exports: [ConfigService],
})
export class ConfigModule {}
