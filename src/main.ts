import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.setGlobalPrefix('api/v1');

  // Basic CORS for POC; tighten in production
  // const config = app.get(ConfigService);
  // const origin = config.get<string>('APP_BASE_URL') ?? true;
  app.enableCors({
    origin: [
      'http://localhost:4001', // frontend local
      'http://10.2.28.93:4001', // frontend ใน LAN
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
