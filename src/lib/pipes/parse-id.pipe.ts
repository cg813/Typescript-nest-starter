import { Injectable } from '@nestjs/common';
import * as Joi from 'joi';
import { JoiPipe } from 'nestjs-joi';

interface ParseIdPipeOptions {
  required: boolean;
}

@Injectable()
export class ParseIdPipe extends JoiPipe {
  constructor(options?: ParseIdPipeOptions) {
    // We use UUIDv4 [wh]

    let schema = Joi.string().uuid({
      version: 'uuidv4',
    });
    if (options && options.required) {
      schema = schema.required();
    } else {
      schema = schema.optional();
    }

    super(schema);
  }
}
