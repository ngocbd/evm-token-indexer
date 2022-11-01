import {AppDataSource} from "./data-source";
import logger from "./logger";
import {BigNumber, ethers, utils} from "ethers";
import {CLOUD_FLARE_GATEWAY_ETH_RPC_URL} from "./constants";
import {TokenContractService, TransferEventService} from "./services";
import {TokenBalance, TransferEvent} from "./entity";
import TokenBalanceService from "./services/TokenBalanceService";
import {PushTransferIDWorker} from "./workers";


const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );

  const worker = new PushTransferIDWorker();
  await worker.run();

};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });

