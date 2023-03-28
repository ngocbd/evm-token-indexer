import { AppDataSource } from './data-source';
import logger from './logger';
import { ethers, utils } from 'ethers';
import { CLOUD_FLARE_GATEWAY_ETH_RPC_URL, ETH_MAIN_NET_RPC_URL, FOUR_BYTES_ETH_RPC_URL, SMART_CHAIN_TEST_NET_RPC_URL, SYNC_BLOCKS_RANGE } from './constants';
import { CounterService } from "./services";
import IndexerConfigService from './services/IndexerConfigService';
import FilterEventWorker from './workers/FilterEventWorker';
import TokenType from './enums/TokenType';
import CounterName from './enums/CounterName';
import { TRANSACTION_SAVE_PER_MESSSAGE, TRANSFER_EVETNS_SAVE_PER_MESSSAGE } from './constants/index';
import RedisService from './services/RedisService';

// tờ giấy nháp 
const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    FOUR_BYTES_ETH_RPC_URL,
  );

  // const configService = new IndexerConfigService();
  // const counterService = new CounterService();

  // await configService.setConfigValue(TRANSACTION_SAVE_PER_MESSSAGE, '50');
  // await configService.setConfigValue(TRANSFER_EVETNS_SAVE_PER_MESSSAGE, '50');
  // await counterService.initOrResetCounter();

  const redis = new RedisService();
  await redis.setValue('test', 'test');
  const test = await redis.getValue('test');
  console.log(test);





};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });
