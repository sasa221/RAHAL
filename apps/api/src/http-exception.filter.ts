import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { ApiError } from "@rahal/contracts";

function errorCodeFromStatus(statusCode: number) {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMITED";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const message =
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null &&
      "message" in exceptionResponse
        ? exceptionResponse.message
        : isHttpException
          ? exception.message
          : "Unexpected server error.";
    const requestId =
      typeof response.locals.requestId === "string" ? response.locals.requestId : undefined;

    const payload: ApiError = {
      error: {
        code: errorCodeFromStatus(statusCode),
        message: Array.isArray(message) ? message.join("; ") : String(message),
        statusCode,
        requestId,
      },
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        JSON.stringify({
          event: "HTTP_REQUEST_FAILED",
          requestId,
          method: request.method,
          path: request.path,
          statusCode,
          exceptionType: exception instanceof Error ? exception.name : "UnknownError",
        }),
      );
    }

    response.status(statusCode).json(payload);
  }
}
