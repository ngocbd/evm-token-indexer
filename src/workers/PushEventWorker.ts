import {ethers, utils} from 'ethers';
import {
  EVENT_TRANSFER_QUEUE_NAME,
  lastReadBlockRedisKey,
  PUSH_EVENT_ERROR_QUEUE_NAME,
  SAVE_LOG_QUEUE_NAME,
} from '../constants';
import logger from '../logger';
import {RabbitMqService, TransferEventService} from '../services';
import RedisService from '../services/RedisService';
import {sleep} from "../utils";

export default class PushEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _rabbitMqService: RabbitMqService;
  _transferEventService: TransferEventService;
  _firstRecognizedTokenBlock: number;
  _redisService: RedisService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._rabbitMqService = new RabbitMqService();
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
      const startFilter = Date.now();
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
      const endFilter = Date.now();
      logger.info(`blocks ${fromBlock} => ${toBlock}: Filter events cost ${endFilter - startFilter} ms`);
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
      await this._rabbitMqService.pushMessage(
        PUSH_EVENT_ERROR_QUEUE_NAME,
        errorMsg,
      );
      logger.info(`Push ${errorMsg} to error queue`);
      return null;
    }
  }

  async pushEventInABlockRange(fromBlock, toBlock, isSaveLogs: boolean) {
    const blockLength = 100;
    try {

      for (let i = fromBlock; i <= toBlock; i += blockLength) {
        let startBlock = i;
        let endBlock = i + blockLength;
        if (endBlock > toBlock) {
          endBlock = toBlock;
        }
        console.log(`Start push event from block ${startBlock} to ${endBlock}`);
        await this.getLogsThenPushToQueue(startBlock, endBlock, isSaveLogs);
      }

    } catch (err: any) {
      logger.error('blocks ${fromBlock} => ${toBlock} Push event error: ' + err);
    }
  }

  async getLogsThenPushToQueue(fromBlock, toBlock, isSaveLogs) {
    const startTime = Date.now();
    const transferEventLogs = await this.getTransferLogs(
      fromBlock,
      toBlock,
    );
    if (!transferEventLogs) {
      return;
    }
    logger.info(
      `blocks ${fromBlock} => ${toBlock} transfer event count:  ${transferEventLogs.length}`,
    );
    const transferEventsMap = new Map<string, unknown[]>();
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

      await this._rabbitMqService.pushMessage(
        EVENT_TRANSFER_QUEUE_NAME,
        message,
      );
      logger.info(
        `blocks ${fromBlock} => ${toBlock}: Push ${events.length} events of token ${events[0].address} to queue`,
      );

      if (isSaveLogs) {
        const logQueueMsg = JSON.stringify({
          address: events[0].address,
          fromBlock,
          toBlock,
        });
        await this._rabbitMqService.pushMessage(
          SAVE_LOG_QUEUE_NAME,
          logQueueMsg,
        );
        logger.info(`blocks ${fromBlock} => ${toBlock}: Push ${logQueueMsg} to log queue`);
      }
    }
    // transferEventsMap.clear();
    const endTime = Date.now();
    logger.info(`blocks ${fromBlock} => ${toBlock}: Push events to queue done, cost ${endTime - startTime} ms`);
  }

  async pushEventTransfer(isSaveLogs: boolean) {
    const blockLength = 25;
    try {

      const currentChainBlockNumber = await this._provider.getBlockNumber();

      const startBlock = await this._detectStartBlock();
      if (currentChainBlockNumber <= startBlock) {
        logger.info('Has Sync To current block');
        return;
      }

      for (
        let i = +startBlock;
        i <= currentChainBlockNumber;
        i += blockLength
      ) {
        const fromBlock = i;
        let toBlock = fromBlock + blockLength;
        if (toBlock >= currentChainBlockNumber) {
          toBlock = currentChainBlockNumber;
        }

        await this.getLogsThenPushToQueue(fromBlock, toBlock, isSaveLogs);
      }
    } catch (err: any) {
      logger.error('blocks ${fromBlock} => ${toBlock} Push event error: ' + err);
    }
  }

  pushEventRealTime(isSaveLogs = false) {
    try {
      let count = 0;
      let blockLength = 5;
      let toBlock = 0;
      this._provider.on('block', async (blockNumber) => {
        logger.info(`New block ${blockNumber} detected`);
        toBlock = blockNumber;
        count++;
        if (count === blockLength) {
          await this.getLogsThenPushToQueue(toBlock - blockLength, toBlock, isSaveLogs);
          count = 0;
        }
      });

    } catch (err: any) {
      logger.error('Push event error: ' + err);
    }
  }


  async run(isSaveLogs = true) {
    console.log(
      `Start push event transfer with save logs option: ${isSaveLogs}`,
    );
    await this.pushEventTransfer(isSaveLogs);
    await sleep(2000)
    this._rabbitMqService.close();
  }
}
