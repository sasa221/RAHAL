import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { createPrismaClient } from "@rahal/database";
import { loadApiConfig } from "../config";

@Injectable()
export class PrismaService implements OnApplicationShutdown {
  readonly client = createPrismaClient(loadApiConfig().databaseUrl);

  async onApplicationShutdown() {
    await this.client.$disconnect();
  }
}
