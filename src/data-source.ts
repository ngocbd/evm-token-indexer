import 'reflect-metadata';
import {DataSource} from 'typeorm';
import {
  TokenBalance,
  TokenContract,
  Transaction,
  TransferEvent,
} from './entity';
import 'dotenv/config';
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_SCHEMA,
  DATABASE_USERNAME
} from "./constants";

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DATABASE_HOST,
  port: DATABASE_PORT,
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  synchronize: true,
  logging: false,
  entities: [TokenContract, Transaction, TransferEvent, TokenBalance],
  migrations: [],
  subscribers: [],
  schema: DATABASE_SCHEMA,
});
