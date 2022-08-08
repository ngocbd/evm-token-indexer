import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfiguration, appConfiguration } from './config/configuration';
import { User } from './entity/user.entity';
import { HealthModule } from './health/health.module';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfiguration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [appConfiguration.KEY],
      useFactory: async (config: AppConfiguration) => ({
        // eslint-disable-next-line @typescript-eslint/prefer-as-const
        type: 'postgres' as 'postgres',
        url: config.db.url,
        entities: [User],
        synchronize: false,
        schema: 'index',
      }),
    }),
    UsersModule,
  ],
  providers: [ResponseInterceptor],
})
export class AppModule {}
