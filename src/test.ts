import { AppDataSource } from './data-source';
import logger from './logger';
import { ethers, utils } from 'ethers';
import { CLOUD_FLARE_GATEWAY_ETH_RPC_URL, ETH_MAIN_NET_RPC_URL, FOUR_BYTES_ETH_RPC_URL, SMART_CHAIN_TEST_NET_RPC_URL, SYNC_BLOCKS_RANGE } from './constants';
import { CounterService } from "./services";
import IndexerConfigService from './services/IndexerConfigService';
import FilterEventWorker from './workers/FilterEventWorker';
import TokenType from './enums/TokenType';

// tờ giấy nháp 
const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    FOUR_BYTES_ETH_RPC_URL,
  );
  const filterWorker = new FilterEventWorker(provider);
  const tokenType = await filterWorker.detectTokenType('0x3bf2922f4520a8BA0c2eFC3D2a1539678DaD5e9D');
  console.log(tokenType);

  // const res = await filterWorker.getTokenMetaData('0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7', TokenType.ERC20);
  // console.log(res);

  // await new CounterService().initOrResetCounter();

};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });
