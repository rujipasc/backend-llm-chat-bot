import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.setGlobalPrefix('api/v1');

  // CORS origins from env (CORS_ORIGINS=comma,separated)
  const config = app.get(ConfigService);
  const originsStr = config.get<string>('CORS_ORIGINS');
  const origins = originsStr
    ? originsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : ['http://localhost:4001'];
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(config.get('PORT') ?? process.env.PORT ?? 3000);
  await app.listen(port);
}
void bootstrap();
