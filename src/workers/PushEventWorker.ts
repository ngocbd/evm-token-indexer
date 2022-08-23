import { ethers, utils } from 'ethers';
import { Publisher } from './index';
import { EVENT_TRANSFER_QUEUE_NAME } from '../constants';
import logger from '../logger';
import { TokenContractService } from '../services';

export default class PushEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _publisher: Publisher;
  _tokenContractService: TokenContractService;
  _firstRecognizedTokenBlock: number;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._publisher = new Publisher(EVENT_TRANSFER_QUEUE_NAME);
    this._tokenContractService = new TokenContractService();
    this._firstRecognizedTokenBlock = 980_743;
  }

  async getTransferEvents() {
    const blockLength = 1000;
    try {
      const erc20TransferMethodTopic = utils.id(
        'Transfer(address,address,uint256)',
      );
      const erc1155TransferSingleTopic = utils.id(
        'TransferSingle(address,address,address,uint256,uint256)',
      );
      const erc1155TransferBatchTopic = utils.id(
        'TransferBatch(address,address,address,uint256[],uint256[])',
      );
      const currentChainBlockNumber = await this._provider.getBlockNumber();
      const latestBlockInDb =
        await this._tokenContractService.getLatestBlockInDb();
      const startBlock =
        latestBlockInDb > this._firstRecognizedTokenBlock
          ? latestBlockInDb
          : this._firstRecognizedTokenBlock;

      if (currentChainBlockNumber <= startBlock) {
        logger.info('Has Sync To current block');
        return;
      }

      const transferEventsMap = new Map<string, unknown[]>();
      for (
        let i = +startBlock;
        i <= currentChainBlockNumber;
        i += blockLength
      ) {
        const fromBlock = i;
        let toBlock = fromBlock + blockLength;
        if (toBlock >= currentChainBlockNumber)
          toBlock = currentChainBlockNumber;
        console.log(fromBlock, toBlock);
        const logs = await this._provider.getLogs({
          fromBlock,
          toBlock,
        });
        const transferEventLogs = logs.filter(
          (item) =>
            item.topics[0] === erc20TransferMethodTopic ||
            item.topics[0] === erc1155TransferBatchTopic ||
            item.topics[0] === erc1155TransferSingleTopic,
        );
        console.log(
          `blocks ${fromBlock} => ${toBlock} transfer event count:  ${transferEventLogs.length}`,
        );
        transferEventLogs.forEach((item) => {
          const contractAddress = item.address;
          if (!transferEventsMap.has(contractAddress)) {
            transferEventsMap.set(contractAddress, [item]);
          } else {
            const events = transferEventsMap.get(contractAddress) as unknown[];
            events.push(item);
            transferEventsMap.set(contractAddress, events);
          }
        });
        const currentCursor = transferEventsMap.values();
        while (true) {
          const result = currentCursor.next();
          if (result.done) {
            break;
          }
          const events = result.value;
          const message = JSON.stringify(events);
          await this._publisher.pushMessage(message);
          logger.info(
            `Push ${events.length} events of token ${events[0].address} to queue`,
          );
          transferEventsMap.clear();
        }
      }

      //
    } catch (err: any) {
      logger.error('Push event error: ' + err);
    }
  }

  async pushEventTransfer(message: string) {
    await this._publisher.pushMessage(message);
    // logger.info(
    //   `Push ${events.length} events of token ${events[0].address} to queue`,
    // );
  }

  async run() {
    await this.getTransferEvents();
  }
}
