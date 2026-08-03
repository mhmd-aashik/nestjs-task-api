import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { ApiErrorResponse } from '../interfaces/api-response.interface';

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();

    const response = httpContext.getResponse<Response>();

    const request = httpContext.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const normalized = this.normalizeExceptionResponse(
      exceptionResponse,
      statusCode,
    );

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode,
      message: normalized.message,
      error: normalized.error,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(statusCode).json(errorResponse);
  }

  private normalizeExceptionResponse(
    exceptionResponse: string | object | null,
    statusCode: number,
  ): {
    message: string | string[];
    error: string;
  } {
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        error: this.getDefaultError(statusCode),
      };
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const body = exceptionResponse as HttpExceptionBody;

      return {
        message: body.message ?? 'An unexpected error occurred',
        error: body.error ?? this.getDefaultError(statusCode),
      };
    }

    return {
      message:
        statusCode === Number(HttpStatus.INTERNAL_SERVER_ERROR)
          ? 'Internal server error'
          : 'Request failed',
      error: this.getDefaultError(statusCode),
    };
  }

  private getDefaultError(statusCode: number): string {
    const error = HttpStatus[statusCode];

    return typeof error === 'string'
      ? error
          .toLowerCase()
          .replaceAll('_', ' ')
          .replace(/\b\w/g, (character) => character.toUpperCase())
      : 'Error';
  }
}
