import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import type { ApiError } from "@rahal/contracts";

function errorCodeFromStatus(statusCode: number) {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
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

    const payload: ApiError = {
      error: {
        code: errorCodeFromStatus(statusCode),
        message: Array.isArray(message) ? message.join("; ") : String(message),
        statusCode,
      },
    };

    response.status(statusCode).json(payload);
  }
}
