import 'reflect-metadata';
import {DataSource} from 'typeorm';
import {
  TokenBalance,
  TokenContract,
  Transaction,
  TransferEvent,
  TokenLog,
  Erc20Balance,
  Erc20TransferEvent,
  Erc721Balance,
  Erc721TransferEvent,
  Erc1155Balance,
  Erc1155TransferEvent,
  Counter, IndexerConf,
} from './entity';
import 'dotenv/config';
import {
  DATABASE_HOST,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_SCHEMA,
  DATABASE_USERNAME, getDatabaseName,
} from './constants';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DATABASE_HOST,
  port: DATABASE_PORT,
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: getDatabaseName(),
  synchronize: false,
  logging: false,
  entities: [
    TokenContract,
    Transaction,
    TransferEvent,
    TokenBalance,
    TokenLog,
    Erc20Balance,
    Erc20TransferEvent,
    Erc721Balance,
    Erc721TransferEvent,
    Erc1155Balance,
    Erc1155TransferEvent,
    Counter,
    IndexerConf,
  ],
  migrations: [],
  subscribers: [],
  schema: DATABASE_SCHEMA,
  uuidExtension: 'pgcrypto',
});
