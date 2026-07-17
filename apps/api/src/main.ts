import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadApiConfig } from "./config";
import { setupApp } from "./setup-app";

async function bootstrap() {
  const config = loadApiConfig();
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableCors({ origin: config.webUrl, credentials: true });
  await app.listen(config.port);
}

void bootstrap();
