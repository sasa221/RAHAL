import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { HttpErrorFilter } from "./http-exception.filter";

const safeRequestId = /^[A-Za-z0-9_-]{8,80}$/;

export function setupApp(app: INestApplication, options: { production?: boolean } = {}) {
  app.setGlobalPrefix("api");
  app.use((request: Request, response: Response, next: NextFunction) => {
    const suppliedRequestId = request.header("x-request-id");
    const requestId =
      suppliedRequestId && safeRequestId.test(suppliedRequestId) ? suppliedRequestId : randomUUID();

    response.locals.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("x-frame-options", "DENY");
    response.setHeader("referrer-policy", "no-referrer");
    response.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader("cross-origin-resource-policy", "same-site");

    if (options.production) {
      response.setHeader("strict-transport-security", "max-age=31536000; includeSubDomains");
    }

    next();
  });
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();

  return app;
}
