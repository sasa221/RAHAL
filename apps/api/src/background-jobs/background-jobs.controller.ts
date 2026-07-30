import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { loadApiConfig } from "../config";
import { BackgroundJobsService } from "./background-jobs.service";

@Controller("internal/jobs")
export class BackgroundJobsController {
  private readonly config = loadApiConfig();

  constructor(private readonly jobs: BackgroundJobsService) {}

  @Get("run")
  async run(@Headers("authorization") authorization?: string) {
    const secret = this.config.backgroundJobs.cronSecret;
    if (!secret) {
      throw new ServiceUnavailableException("Scheduled jobs are not configured.");
    }
    const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const expectedBuffer = Buffer.from(secret);
    const suppliedBuffer = Buffer.from(supplied);
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Scheduled job authorization failed.");
    }

    return {
      status: "completed",
      ...(await this.jobs.runScheduledBatch()),
      timestamp: new Date().toISOString(),
    };
  }
}
