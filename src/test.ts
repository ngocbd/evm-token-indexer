import { AppDataSource } from './data-source';
import logger from './logger';
import { ethers, utils } from 'ethers';
import { SMART_CHAIN_TEST_NET_RPC_URL, SYNC_BLOCKS_RANGE } from './constants';
import { CounterService } from "./services";
import IndexerConfigService from './services/IndexerConfigService';

// tờ giấy nháp 
const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    SMART_CHAIN_TEST_NET_RPC_URL,
  );
  const counterService = new CounterService();
  // await counterService.initOrResetCounter();
  const configService = new IndexerConfigService();
  await configService.setConfigValue(SYNC_BLOCKS_RANGE, '100');


};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });
