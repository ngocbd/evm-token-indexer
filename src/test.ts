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
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );
  const filterWorker = new FilterEventWorker(provider);
  const res = await filterWorker.getTokenMetaData('0xBC7De10AFe530843e71DfB2e3872405191e8d14A', TokenType.ERC20);
  console.log(res);

};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });
