/* eslint-disable prettier/prettier */
import {AppDataSource} from './data-source';
import logger from './logger';
import {ethers, utils} from 'ethers';
import {SYNC_BLOCKS_RANGE} from './constants';
import {CounterService} from "./services";
import IndexerConfigService from './services/IndexerConfigService';
import FilterEventWorker from './workers/FilterEventWorker';

import {TRANSACTION_SAVE_PER_MESSSAGE, TRANSFER_EVETNS_SAVE_PER_MESSSAGE} from './constants';


// tờ giấy nháp
const main = async () => {

  const configService = new IndexerConfigService();
  const counterService = new CounterService();

  await configService.setConfigValue(TRANSACTION_SAVE_PER_MESSSAGE, '50');
  await configService.setConfigValue(TRANSFER_EVETNS_SAVE_PER_MESSSAGE, '50');
  await configService.setConfigValue(SYNC_BLOCKS_RANGE, '50');
  // await counterService.initOrResetCounter();

  // const redis = new RedisService();
  // await redis.setValue('test', 'test');
  // const test = await redis.getValue('test');
  // console.log(test);


};
// main();
AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });
