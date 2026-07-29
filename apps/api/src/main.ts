import { NestFactory } from "@nestjs/core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module";
import { loadApiConfig } from "./config";
import { setupApp } from "./setup-app";

const localEnvPath = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")].find(
  existsSync,
);
if (localEnvPath) process.loadEnvFile(localEnvPath);

async function bootstrap() {
  const config = loadApiConfig();
  const app = await NestFactory.create(AppModule);
  setupApp(app, { production: config.production });
  app.enableCors({ origin: config.webUrl, credentials: true });
  await app.listen(config.port);
}

void bootstrap();
