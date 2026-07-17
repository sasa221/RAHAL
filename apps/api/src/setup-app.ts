import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { HttpErrorFilter } from "./http-exception.filter";

export function setupApp(app: INestApplication) {
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  return app;
}
