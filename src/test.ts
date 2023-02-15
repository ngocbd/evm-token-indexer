import { AppDataSource } from './data-source';
import logger from './logger';
import { ethers, utils } from 'ethers';
import { SMART_CHAIN_TEST_NET_RPC_URL } from './constants';
import { CounterService } from "./services";

// tờ giấy nháp
const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    SMART_CHAIN_TEST_NET_RPC_URL,
  );
  // const counterService = new CounterService();
  // await counterService.initOrResetCounter();

  const p2 = new Promise((resolve, reject) => {
    setTimeout(resolve, 500, 'two');
  });

  const p1 = new Promise((resolve, reject) => {
    setTimeout(resolve, 400, 'one');
  });

  const response = await Promise.race([p1, p2]);
  console.log(response);


};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });
