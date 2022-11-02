import {AppDataSource} from "./data-source";
import logger from "./logger";
import {BigNumber, ethers, utils} from "ethers";
import {CLOUD_FLARE_GATEWAY_ETH_RPC_URL, ERC20_ABI} from "./constants";
import {TokenContractService, TransferEventService} from "./services";
import {TokenBalance, TransferEvent} from "./entity";
import TokenBalanceService from "./services/TokenBalanceService";
import {PushTransferIDWorker} from "./workers";
import {getContract} from "./utils";


const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );


  const service = new TokenContractService();
  const tokens = await service.findAllValidatedERC20Token();
  for (const token of tokens) {
    try {
      const erc20Contract = getContract(
        token.address,
        ERC20_ABI,
        provider,
      );
      const totalSupply = await erc20Contract.totalSupply();
      token.total_supply = totalSupply.toString();
      const updated = await service.update(token);
      logger.info(`Updated token ${updated.address} total supply ${updated.total_supply}`);
    } catch (err) {
      console.log(err)
    }
  }

};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });

