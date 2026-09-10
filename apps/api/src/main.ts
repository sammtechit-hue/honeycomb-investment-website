import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation is applied per-controller (@UsePipes), not globally: a global
  // class-validator ValidationPipe with whitelist:true strips every field on
  // DTOs that use zod instead (nestjs-zod's createZodDto) since it only
  // recognizes class-validator decorators, silently emptying the body before
  // the zod pipe ever runs. See investor.controller.ts / investor/dto for
  // the zod-based resource, and the other controllers for the class-validator
  // ones — each opts into its own validation pipe.

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
