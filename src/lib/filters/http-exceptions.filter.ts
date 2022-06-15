import { LogService } from '@elunic/logger';
import { InjectLogger } from '@elunic/logger-nestjs';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AlreadyInUseError,
  ArgumentError,
  ArgumentNullError,
  AuthenticationRequiredError,
  NotFoundError,
  NotPermittedError,
} from 'common-errors';
import { Response } from 'express';

import { asError } from '../data-response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@InjectLogger(HttpExceptionFilter.name) private readonly logger: LogService) {}

  catch(err: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (this.logger) {
      this.logger.error([err, err.stack]);
    }

    let error: HttpException;
    if (err instanceof HttpException) {
      error = err;
    } else if (err instanceof ArgumentError || err instanceof ArgumentNullError) {
      error = new BadRequestException(err.message);
    } else if (err instanceof AlreadyInUseError) {
      error = new ConflictException(err.message);
    } else if (err instanceof AuthenticationRequiredError) {
      error = new UnauthorizedException(err.message);
    } else if (err instanceof NotFoundError) {
      error = new NotFoundException(err.message);
    } else if (err instanceof NotPermittedError) {
      error = new ForbiddenException(err.message);
    } else {
      error = new BadRequestException(err.message);
    }
    response.status(error.getStatus()).json(asError(error));
  }
}
