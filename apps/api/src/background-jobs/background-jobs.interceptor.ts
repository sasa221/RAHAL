import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { concatMap, type Observable } from "rxjs";
import { loadApiConfig } from "../config";
import { BackgroundJobsService } from "./background-jobs.service";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class BackgroundJobsInterceptor implements NestInterceptor {
  private readonly config = loadApiConfig();

  constructor(private readonly jobs: BackgroundJobsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (
      this.config.backgroundJobs.mode !== "request" ||
      !mutationMethods.has(request.method.toUpperCase())
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      concatMap(async (value) => {
        await this.jobs.runRequestBatch();
        return value;
      }),
    );
  }
}
