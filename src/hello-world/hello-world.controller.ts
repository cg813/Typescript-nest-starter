import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { asResponse, DataResponse } from '../lib/data-response';

@Controller('/hello-world')
export class HelloWorldController {
  @Get('/')
  @ApiResponse({})
  async getHelloWorld(): Promise<DataResponse<string>> {
    return asResponse('hello world');
  }
}
