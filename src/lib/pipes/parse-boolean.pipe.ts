import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as Joi from 'joi';

const SCHEMA = Joi.alternatives(
  Joi.boolean(),
  Joi.string().allow('', '1', '0', 'true', 'false').only(),
  Joi.number().integer().allow(0, 1).only(),
);

interface ParseBooleanPipeOptions {
  required: boolean;
}

@Injectable()
export class ParseBooleanPipe implements PipeTransform {
  private options: ParseBooleanPipeOptions;

  constructor(options?: ParseBooleanPipeOptions) {
    this.options = options || { required: false };
  }

  transform(value: unknown, metadata: ArgumentMetadata): boolean | undefined {
    const schema = this.options.required ? SCHEMA.required() : SCHEMA.optional();

    const res = schema.validate(value);

    if (res.error) {
      throw new BadRequestException(
        `Validation failed on ${metadata.type} property '${metadata.data}' (boolean expected)`,
      );
    }

    // If not required and not defined, return undefined to avoid
    if (typeof value === 'undefined') {
      return;
    }

    return [1, '1', 'true'].includes((value as unknown) as string);
  }
}
