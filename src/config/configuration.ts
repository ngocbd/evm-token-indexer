import { Inject } from '@nestjs/common';
import { ConfigType, registerAs } from '@nestjs/config';

export const appConfiguration = registerAs('app', () => {
  return {
    debug: process.env.DEBUG || false,
    port: parseInt(process.env.PORT, 10) || 3000,
    db: {
      url: process.env.DB_URL,
    },
  };
});

export type AppConfiguration = ConfigType<typeof appConfiguration>;
export const InjectAppConfig = () => Inject(appConfiguration.KEY);
