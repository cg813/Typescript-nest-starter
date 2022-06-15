import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiResponse, asResponse, DataResponse } from '.';

// This is the interface from  @nestjsx/crud
interface GetManyDefaultResponse<T> {
  data: T[];
  count: number;
  total: number;
  page: number;
  pageCount: number;
}

// eslint-disable-next-line
function isCrudResponse(res: any): res is GetManyDefaultResponse<unknown> {
  const keys: Array<keyof GetManyDefaultResponse<unknown>> = ['count', 'page', 'total'];
  return !keys.some(key => typeof res[key] !== 'number') && Array.isArray(res.data);
}

function isDataResponse(res: unknown): res is ApiResponse<unknown> {
  return (
    !!res &&
    Object.prototype.hasOwnProperty.call(res, 'data') &&
    Object.prototype.hasOwnProperty.call(res, 'meta') &&
    Object.prototype.isPrototypeOf.call(
      Object.prototype,
      ((res as Record<string, unknown>).meta as unknown) as typeof Object.prototype,
    )
  );
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<DataResponse<unknown>> {
    const now = Date.now();
    return next.handle().pipe(
      map(res => {
        const responseTime = Date.now() - now;

        // Transform a ManyResponse from @nestjsx/crud into a DataResponse
        if (isCrudResponse(res)) {
          return asResponse(res.data, {
            count: res.count,
            total: res.total,
            page: res.page,
            pageCount: res.pageCount,
            responseTime,
          });
        }

        // Don't modify a DataResponse's structure, just add the responseTime
        if (isDataResponse(res)) {
          return {
            data: res.data,
            meta: {
              ...res.meta,
              responseTime,
            },
          };
        }

        return asResponse(res, { responseTime });
      }),
    );
  }
}
