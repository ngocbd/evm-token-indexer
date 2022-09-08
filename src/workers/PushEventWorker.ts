import { ethers, utils } from 'ethers';
import { Publisher } from './index';
import {
  EVENT_TRANSFER_QUEUE_NAME,
  lastReadBlockRedisKey,
  PUSH_EVENT_ERROR_QUEUE_NAME,
  SAVE_LOG_QUEUE_NAME,
} from '../constants';
import logger from '../logger';
import { TokenContractService, TransferEventService } from '../services';
import RedisService from '../services/RedisService';

export default class PushEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _publisher: Publisher;
  _errorPublisher: Publisher;
  _logPublisher: Publisher;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _firstRecognizedTokenBlock: number;
  _redisService: RedisService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._publisher = new Publisher(EVENT_TRANSFER_QUEUE_NAME);
    this._errorPublisher = new Publisher(PUSH_EVENT_ERROR_QUEUE_NAME);
    this._logPublisher = new Publisher(SAVE_LOG_QUEUE_NAME);
    this._tokenContractService = new TokenContractService();
    this._firstRecognizedTokenBlock = 980_743;
    // this._firstRecognizedTokenBlock = 14481371 ;
    this._redisService = new RedisService();
    this._transferEventService = new TransferEventService();
  }

  /*
   * Detect start block
   * if cached exist use cached block number
   * else if latest block in db > first recognized block use block in db
   * else use first recognized block
   * */
  private async _detectStartBlock(): Promise<number> {
    const cachedBlock = await this._redisService.getValue(
      lastReadBlockRedisKey,
    );
    if (
      cachedBlock !== null &&
      parseInt(cachedBlock) > this._firstRecognizedTokenBlock
    ) {
      return parseInt(cachedBlock);
    }
    const inDbBlock = await this._transferEventService.getHighestBlock();
    return inDbBlock > this._firstRecognizedTokenBlock
      ? inDbBlock
      : this._firstRecognizedTokenBlock;
  }

  async getTransferLogs(fromBlock, toBlock, retries = 3) {
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

      const transferEventLogs = await this._provider.getLogs({
        fromBlock,
        toBlock,
        topics: [
          [
            erc20TransferMethodTopic,
            erc1155TransferBatchTopic,
            erc1155TransferSingleTopic,
          ],
        ],
      });
      return transferEventLogs;
    } catch (err: any) {
      if (retries > 0) {
        logger.warn(
          `Blocks: ${fromBlock} => ${toBlock} get transfer logs failed retries left: ${retries}`,
        );
        return this.getTransferLogs(fromBlock, toBlock, retries - 1);
      }
      logger.error(
        'Blocks: ${fromBlock} => ${toBlock} get transfer logs error: ' + err,
      );

      const errorMsg = JSON.stringify({
        err: err?.message || '',
        fromBlock,
        toBlock,
      });
      await this._errorPublisher.pushMessage(errorMsg);
      logger.info(`Push ${errorMsg} to error queue`);
      return null;
    }
  }

  async pushEventTransfer() {
    const blockLength = 100;
    try {
      await this._redisService.init();
      const currentChainBlockNumber = await this._provider.getBlockNumber();
      console.log('block height: ', currentChainBlockNumber);
      const startBlock = await this._detectStartBlock();
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
        const transferEventLogs = await this.getTransferLogs(
          fromBlock,
          toBlock,
        );
        if (!transferEventLogs) {
          continue;
        }
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
          //push to save log queue only when this queue has receivers
          const logQueueReceiverCount =
            await this._logPublisher.getReceiverCount();
          if (logQueueReceiverCount > 0) {
            const logQueueMsg = JSON.stringify({
              address: events[0].address,
              fromBlock,
              toBlock,
            });
            await this._logPublisher.pushMessage(logQueueMsg);
            logger.info(`Push ${logQueueMsg} to log queue`);
          }
          //update cached
          await this._redisService.setValue(lastReadBlockRedisKey, toBlock);
        }
        transferEventsMap.clear();
      }
    } catch (err: any) {
      logger.error('Push event error: ' + err);
    }
  }

  async run() {
    await this.pushEventTransfer();
  }
}
