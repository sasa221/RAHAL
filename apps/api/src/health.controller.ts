import { Controller, Get, Optional, ServiceUnavailableException } from "@nestjs/common";
import { AuthRateLimitService } from "./auth/auth-rate-limit.service";
import { PrismaService } from "./database/prisma.service";
import { PrivateDocumentStorage } from "./reservations/private-document-storage";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly rateLimits?: AuthRateLimitService,
    @Optional() private readonly documentStorage?: PrivateDocumentStorage,
  ) {}

  @Get()
  check() {
    return { status: "ok", service: "rahal-api", timestamp: new Date().toISOString() };
  }

  @Get("live")
  live() {
    return { status: "alive", service: "rahal-api", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  async ready() {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      await Promise.all([this.rateLimits?.readiness(), this.documentStorage?.readiness()]);
      return {
        status: "ready",
        service: "rahal-api",
        dependencies: {
          database: "ready",
          rateLimit: "ready",
          privateStorage: "ready",
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException("Dependency readiness check failed.");
    }
  }
}
