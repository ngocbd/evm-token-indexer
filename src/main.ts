import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { appConfiguration, AppConfiguration } from './config/configuration';
import { HttpExceptionFilter } from './interceptors/exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

const configureSwagger = (app: INestApplication) => {
  const swaggerDocOptions = new DocumentBuilder()
    .setTitle('nest template')
    .setDescription('The nest template API description')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'apiKey',
        scheme: 'JWT',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Type into the text box: Bearer {your JWT token}',
        in: 'header',
      },
      'JWT',
    )
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerDocOptions, {
    ignoreGlobalPrefix: true,
  });
  SwaggerModule.setup('docs', app, swaggerDoc);
};

const configureValidation = (app: INestApplication) => {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get<AppConfiguration>(appConfiguration.KEY);
  app.enableShutdownHooks();

  configureSwagger(app);
  configureValidation(app);
  app.enableCors();

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(appConfig.port);
}
bootstrap();
