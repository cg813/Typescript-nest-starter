import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';

export * from './response.interceptor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Constructor<T = any> extends Function {
  new (...args: unknown[]): T;
}

export type DataResponseMeta = Record<string, unknown>;

export interface DataResponse<T, U extends DataResponseMeta = DataResponseMeta> {
  data: T;
  meta: U;
}

export interface ErrorResponse<T = unknown, U extends DataResponseMeta = DataResponseMeta> {
  error: T;
  meta: U;
}

export function asResponse<T>(obj: T): DataResponse<T>;
export function asResponse<T, U extends DataResponseMeta = Record<string, unknown>>(
  obj: T,
  metaObj: U,
): DataResponse<T, U>;
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function asResponse(obj: unknown, metaObj?: unknown) {
  if (metaObj) {
    return {
      data: obj,
      meta: metaObj,
    };
  } else {
    return {
      data: obj,
      meta: {},
    };
  }
}

export function asError<T>(error: T): ErrorResponse<T> {
  return { error, meta: {} };
}

export interface PagedDataResponseMeta extends DataResponseMeta {
  count: number;
  total: number;
  page: number;
  pageCount: number;
}

export class ApiResponse<T, U extends DataResponseMeta = DataResponseMeta>
  implements DataResponse<T, U> {
  @ApiProperty({ type: Object })
  data!: T;

  @ApiProperty({ type: Object })
  meta!: U;
}

export class ApiPagedMeta implements PagedDataResponseMeta {
  [key: string]: unknown;

  @ApiProperty({ type: Number })
  count!: number;

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  pageCount!: number;
}

export class ApiErrorResponse {
  @ApiResponseProperty()
  statusCode!: number;

  @ApiResponseProperty()
  message!: string;

  @ApiResponseProperty()
  error!: string;
}

export class ApiPagedResponse<T> implements DataResponse<T[], ApiPagedMeta> {
  @ApiProperty({ type: Object, isArray: true })
  data!: T[];

  @ApiProperty({ type: ApiPagedMeta })
  meta!: ApiPagedMeta;
}

export function getResponseFor<T extends Constructor>(type: T): typeof ApiResponse {
  class ApiResponseForEntity extends ApiResponse<T> {
    @ApiProperty({ type })
    data!: T;
  }
  Object.defineProperty(ApiResponseForEntity, 'name', {
    value: `ApiResponseForEntity${type.name}`,
  });

  return ApiResponseForEntity as typeof ApiResponse;
}

export function getPagedResponseFor<T extends Constructor>(type: T): typeof ApiResponse {
  class ApiResponseForEntityArray extends ApiPagedResponse<T> {
    @ApiProperty({
      type,
      isArray: true,
    })
    data!: T[];
  }
  Object.defineProperty(ApiResponseForEntityArray, 'name', {
    value: `ApiResponseForEntityMany${type.name}`,
  });

  return ApiResponseForEntityArray as typeof ApiResponse;
}

export function getErrorResponseFor(statusCode: number): typeof ApiErrorResponse {
  class ApiErrorResponseForCode extends ApiErrorResponse {
    @ApiResponseProperty({ example: statusCode })
    statusCode!: number;
  }
  Object.defineProperty(ApiErrorResponseForCode, 'name', {
    value: `ApiErrorResponseForCode${statusCode}`,
  });

  return ApiErrorResponseForCode;
}
