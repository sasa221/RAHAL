import { Controller, Get, Optional, ServiceUnavailableException } from "@nestjs/common";
import { AuthRateLimitService } from "./auth/auth-rate-limit.service";
import { loadApiConfig } from "./config";
import { PrismaService } from "./database/prisma.service";
import { PrivateDocumentStorage } from "./reservations/private-document-storage";

@Controller("health")
export class HealthController {
  private readonly config = loadApiConfig();

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
      await this.rateLimits?.readiness();
      const storageConfigured = this.documentStorage?.configured() ?? false;
      if (storageConfigured) await this.documentStorage?.readiness();
      return {
        status: storageConfigured ? "ready" : "degraded",
        service: "rahal-api",
        releaseTier: this.config.releaseTier,
        dependencies: {
          database: "ready",
          rateLimit: "ready",
          privateStorage: storageConfigured ? "ready" : "unconfigured",
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException("Dependency readiness check failed.");
    }
  }
}
