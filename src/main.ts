#!/usr/bin/env node
import {
  CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  EVENT_TRANSFER_QUEUE_NAME,
  lastReadBlockRedisKey,
  LIST_AVAILABLE_WORKERS,
  PUSH_EVENT_ERROR_QUEUE_NAME,
  SAVE_DATA_QUEUE_NAME,
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
import { getQueueStatus, sleep } from './utils';
import SaveLogWorker from './workers/SaveLogWorker';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import RedisService from './services/RedisService';

const main = async () => {
  const argv = yargs(hideBin(process.argv)).argv;
  const provider = new ethers.providers.JsonRpcProvider(
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );
  const workerName = argv.worker;
  const task = argv.task;
  if (task) {
    if (task === 'queue-status') {
      const latestBlock = await provider.getBlockNumber();
      const pushEventQueue = await getQueueStatus(EVENT_TRANSFER_QUEUE_NAME);
      const saveDataQueue = await getQueueStatus(SAVE_DATA_QUEUE_NAME);
      const saveLogQueue = await getQueueStatus(SAVE_LOG_QUEUE_NAME);
      const errorQueue = await getQueueStatus(PUSH_EVENT_ERROR_QUEUE_NAME);
      const redisService = new RedisService();
      const currentSyncBlock =
        (await redisService.getValue(lastReadBlockRedisKey)) || '0';

      console.table([pushEventQueue, saveDataQueue, saveLogQueue, errorQueue]);
      console.log(
        `Current sync block: ${parseInt(currentSyncBlock).toLocaleString()}`,
      );
      console.log(`Latest block: ${latestBlock.toLocaleString()}`);
      console.log(
        'Block left: ',
        (latestBlock - parseInt(currentSyncBlock)).toLocaleString(),
      );
      process.exit(0);
    }
  }
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
        await new Receiver('evm-indexer').consumeMessage(async (msg) => {
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
