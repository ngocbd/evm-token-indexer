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
  PushEventWorker, PushTokenForCrawler, PushTransferIDWorker,
  SaveDataWorker,
  SaveTransactionWorker,
  SaveTransferEventWorker, TokenBalanceWorker, UpdateTotalSupplyWorker
} from './workers';
import logger from './logger';
import SaveLogWorker from './workers/SaveLogWorker';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {RabbitMqService, TokenContractService} from "./services";
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
      case LIST_AVAILABLE_WORKERS.SaveTransferEventWorker:
        await new SaveTransferEventWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.PushTokenForCrawlerWorker:
        const pushTokenForCrawlerWorker = new PushTokenForCrawler();
        await pushTokenForCrawlerWorker.run();
        break;
      case LIST_AVAILABLE_WORKERS.CrawlTokenHolderWorker:
        const crawlTokenHolderWorker = new CrawlTokenHolder(provider);
        await crawlTokenHolderWorker.run();
        break;
      case LIST_AVAILABLE_WORKERS.PushTransferIDWorker:
        const pushTransferIDWorker = new PushTransferIDWorker();
        await pushTransferIDWorker.run();
        break;
      case LIST_AVAILABLE_WORKERS.TokenBalanceWorker:
        const tokenBalanceWorker = new TokenBalanceWorker();
        await tokenBalanceWorker.run();
        break;
      case LIST_AVAILABLE_WORKERS.SaveLogWorker:
        await new SaveLogWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.UpdateTotalSupplyWorker:
        const updateTokenSupplyWorker = new UpdateTotalSupplyWorker(provider);
        await updateTokenSupplyWorker.run();
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
