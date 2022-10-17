import {AppDataSource} from "./data-source";
import logger from "./logger";
import {ethers, utils} from "ethers";
import {CLOUD_FLARE_GATEWAY_ETH_RPC_URL} from "./constants";


const main = async () => {
  //15_723_747 => 15_723_755
  const currentSyncBlock = 15_723_755
  const provider = new ethers.providers.JsonRpcProvider(
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );
  const latestBlock = await provider.getBlockNumber();
  console.log('latestBlock', latestBlock);
  console.log('currentSyncBlock', currentSyncBlock);
  const blockRange = latestBlock - currentSyncBlock;
  console.log('blockRange', blockRange);
  const erc1155TransferBatchTopic = utils.id(
    'TransferBatch(address,address,address,uint256[],uint256[])',
  );
  console.log(erc1155TransferBatchTopic);

};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });

