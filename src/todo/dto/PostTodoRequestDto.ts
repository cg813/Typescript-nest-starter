import { assertISODate } from '@elunic/is-iso-date';
import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class PostTodoRequestDto {
  @ApiProperty()
  @JoiSchema(Joi.string())
  title!: string;

  @ApiProperty()
  @JoiSchema(Joi.string())
  description!: string;

  @ApiProperty({ example: new Date().toISOString() })
  @JoiSchema(Joi.string().custom(assertISODate))
  dueDate!: string;
}
