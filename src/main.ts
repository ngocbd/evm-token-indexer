#!/usr/bin/env node
import {
  CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  LIST_AVAILABLE_WORKERS,
} from './constants';
import {ethers} from 'ethers';
import {AppDataSource} from './data-source';
//typeorm migration
import 'reflect-metadata';
import {
  CrawlTokenHolder,
  FilterEventWorker,
  PushEventWorker,
  SaveDataWorker,
  SaveTransactionWorker,
  SaveTransferEventWorker
} from './workers';
import logger from './logger';
import SaveLogWorker from './workers/SaveLogWorker';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {RabbitMqService} from "./services";
import {sleep} from "./utils";
import PushDeletePageWorker from "./workers/PushDeletePageWorker";
import DeleteDuplicateWorker from "./workers/DeleteDuplicateWorker";


const main = async () => {
  const argv = yargs(hideBin(process.argv)).argv;
  const provider = new ethers.providers.JsonRpcProvider(
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );

  const workerName = argv.worker;
  const isSaveLog = +argv.saveLog === 1;
  const address  = "0xdac17f958d2ee523a2206206994597c13d831ec7"
  const crawler = new CrawlTokenHolder(provider)
  await crawler.crawlTokenHolder(address)
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
        await pushEventWorker.run(isSaveLog);
        break;
      case LIST_AVAILABLE_WORKERS.PushDeletePageWorker:
        const pushDeletePageWorker = new PushDeletePageWorker();
        await pushDeletePageWorker.run();
        break;
      case LIST_AVAILABLE_WORKERS.DeleteDuplicateWorker:
        const deleteDuplicate = new DeleteDuplicateWorker();
        await deleteDuplicate.run();
        break;
      case LIST_AVAILABLE_WORKERS.SaveTransactionWorker:
        await new SaveTransactionWorker(provider).run();
        break;
      /*      case LIST_AVAILABLE_WORKERS.ClearDatabase:
              await new SaveDataWorker(provider).clearAllData();
              console.log('Clear all records in database and reset cached blocks');
              break;*/
      case LIST_AVAILABLE_WORKERS.SaveTransferEventWorker:
        await new SaveTransferEventWorker(provider).run();
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
