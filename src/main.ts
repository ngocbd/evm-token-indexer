#!/usr/bin/env node
import {
  CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  FOUR_BYTES_ETH_RPC_URL,
  FOUR_BYTES_LAN_ETH_RPC_URL,
  LIST_AVAILABLE_WORKERS,
} from './constants';
import { ethers } from 'ethers';
import { AppDataSource } from './data-source';
//typeorm migration
import 'reflect-metadata';
import {
  FilterEventWorker,
  PushEventWorker,
  SaveBalanceWorker,
  SaveTokenWorker,
  SaveTransactionWorker,
} from './workers';
import logger from './logger';
import SaveLogWorker from './workers/SaveLogWorker';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import SaveTransferEventWorker from './workers/SaveTransferEventWorker';
import TestPush from './workers/TestPush';
import TestListen from './workers/TestListen';


const main = async () => {
  const argv = yargs(hideBin(process.argv)).argv;
  const provider = new ethers.providers.JsonRpcProvider(
    FOUR_BYTES_LAN_ETH_RPC_URL,
  );

  const workerName = argv.worker;
  const isSaveLog = +argv.saveLog === 1;


  //TODO: INIT COUNTER TABLE AND BLOCK_RANGE_NUMBER IN CONFIG TABLE

  if (workerName) {
    switch (workerName) {
      case LIST_AVAILABLE_WORKERS.SaveTokenWorker:
        await new SaveTokenWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.FilterEventWorker:
        await new FilterEventWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.SaveBalanceWorker:
        await new SaveBalanceWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.PushEventWorker:
        const pushEventWorker = new PushEventWorker(provider);
        await pushEventWorker.run(isSaveLog);
        break;

      case LIST_AVAILABLE_WORKERS.SaveTransferEventWorker:
        await new SaveTransferEventWorker(provider).run();
        break;

      case LIST_AVAILABLE_WORKERS.SaveTransactionWorker:
        await new SaveTransactionWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.SaveLogWorker:
        await new SaveLogWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.TestPusher:
        await new TestPush().run();
        break;
      case LIST_AVAILABLE_WORKERS.TestListener:
        await new TestListen().run();
        break;
      case 'list-workers':
        console.log('Available workers: ');
        for (const [key, value] of Object.entries(LIST_AVAILABLE_WORKERS)) {
          console.log(`${key}: $ npm run worker ${value}`);
        }
        break;
      default:
        console.error(`Worker ${workerName} is not available`);
        console.log('Available workers: ');
        for (const [key, value] of Object.entries(LIST_AVAILABLE_WORKERS)) {
          console.log(`${key}: $ npm run worker ${value}`);
        }
        break;
    }
  }
};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });
