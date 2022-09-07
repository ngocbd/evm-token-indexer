#!/usr/bin/env node
import {
  CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  ETH_MAIN_NET_RPC_URL,
  LIST_AVAILABLE_WORKERS,
  SAVE_LOG_QUEUE_NAME,
} from './constants';
import { ethers } from 'ethers';
import { AppDataSource } from './data-source';
//typeorm migration
import 'reflect-metadata';
import {
  FilterEventWorker,
  Publisher,
  PushEventWorker,
  SaveDataWorker,
} from './workers';
import Receiver from './workers/Receiver';
import logger from './logger';
import { sleep } from './utils';
import SaveLogWorker from './workers/SaveLogWorker';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const main = async () => {
  const argv = yargs(hideBin(process.argv)).argv
  const provider = new ethers.providers.JsonRpcProvider(CLOUD_FLARE_GATEWAY_ETH_RPC_URL);


  const workerName = argv.worker
  if (workerName) {
    switch (workerName) {
      case LIST_AVAILABLE_WORKERS.SaveDataWorker:
        await new SaveDataWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.FilterEventWorker:
        await new FilterEventWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.PushEventWorker:
        const pushEventWorker = new PushEventWorker(provider);

        await pushEventWorker.run();
        break;
      case LIST_AVAILABLE_WORKERS.ReceiverWorker:
        await new Receiver(SAVE_LOG_QUEUE_NAME).consumeMessage(async (msg) => {
          if (msg === 'Hello 1') {
            console.log('receive hello 1 and sleep');
            await sleep(1000);
          }
          console.log(msg);
        });
        break;
      case LIST_AVAILABLE_WORKERS.PublisherWorker:
        const publisher = new Publisher(SAVE_LOG_QUEUE_NAME);
        for (let i = 0; i < 100; i++) {
          const res = await publisher.getReceiverCount();
          console.log(res);
          await sleep(2000);
        }
        break;
      case LIST_AVAILABLE_WORKERS.ClearDatabase:
        await new SaveDataWorker(provider).clearAllData();
        console.log('Clear all records in database and reset cached blocks');
        break;
      case LIST_AVAILABLE_WORKERS.SaveLogWorker:
        await new SaveLogWorker(provider).run();
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
