import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  TokenBalance,
  TokenContract,
  Transaction,
  TransferEvent,
} from './entity';
import 'dotenv/config';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: true,
  logging: false,
  entities: [TokenContract, Transaction, TransferEvent, TokenBalance],
  migrations: [],
  subscribers: [],
  schema: process.env.DATABASE_SCHEMA,
});
