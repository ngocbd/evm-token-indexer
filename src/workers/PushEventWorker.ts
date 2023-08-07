import {ethers, utils} from 'ethers';
import {
  EVENT_TRANSFER_QUEUE_NAME,
  PUSH_EVENT_ERROR_QUEUE_NAME,
  SAVE_LOG_QUEUE_NAME,
  SYNC_BLOCKS_RANGE,
} from '../constants';
import logger from '../logger';
import {
  CounterService,
  IndexerConfigService,
  RabbitMqService,
  TransferEventService,
} from '../services';
import RedisService from '../services/RedisService';
import {sleep} from '../utils';
import CounterName from '../enums/CounterName';

export default class PushEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _rabbitMqService: RabbitMqService;
  _transferEventService: TransferEventService;
  _firstRecognizedTokenBlock: number;
  _redisService: RedisService;
  _counterService: CounterService;
  _indexerConfService: IndexerConfigService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._rabbitMqService = new RabbitMqService();
    this._firstRecognizedTokenBlock = 980_743;
    // this._firstRecognizedTokenBlock = 14481371;
    this._redisService = new RedisService();
    this._transferEventService = new TransferEventService();
    this._counterService = new CounterService();
    this._indexerConfService = new IndexerConfigService();
  }

  /*
   * Detect start block
   * if block number in db > first recognized block use it
   * else use first recognized block
   * */
  private async _detectStartBlock(): Promise<number> {
    const inDbBlockRes = await this._counterService.getCounter(
      CounterName.BLOCK_NUMBER,
    );
    const inDbBlock = Number(inDbBlockRes)
    return inDbBlock > this._firstRecognizedTokenBlock
      ? inDbBlock
      : this._firstRecognizedTokenBlock;
  }


  //defaut timeout is 30s
  async getTransferLogs(fromBlock, toBlock, timeout = 5_000) {
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

      const racePromise = new Promise((resolve, reject) => {
        setTimeout(resolve, timeout, 'timeout');
      });

      const getTransferEventLogPromise: Promise<any> = this._provider.getLogs({
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

      const raceResult: any = await Promise.race([racePromise, getTransferEventLogPromise]);
      if (raceResult === 'timeout') {
        throw new Error('Timeout');
      }
      return raceResult;
    } catch (err: any) {
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
        logger.info(`Start push event from block ${startBlock} to ${endBlock}`);
        await this.getLogsThenPushToQueue(startBlock, endBlock, isSaveLogs);
      }
    } catch (err: any) {
      logger.error(
        'blocks ${fromBlock} => ${toBlock} Push event error: ' + err,
      );
    }
  }

  async getLogsThenPushToQueue(fromBlock, toBlock, isSaveLogs) {
    const transferEventLogs = await this.getTransferLogs(fromBlock, toBlock);
    if (!transferEventLogs) {
      return;
    }
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
        logger.info(
          `blocks ${fromBlock} => ${toBlock}: Push ${logQueueMsg} to log queue`,
        );
      }
    }
  }

  async getBlockRange() {
    const blockRangeConfig = await this._indexerConfService.getConFigValue(
      SYNC_BLOCKS_RANGE,
    );
    return blockRangeConfig ? +blockRangeConfig : 100;
  }

  async pushEventTransfer(isSaveLogs: boolean) {
    try {
      let startBlock = await this._detectStartBlock();
      const currentChainBlockNumber = await this._provider.getBlockNumber();
      console.log(`Current chain block number: ${currentChainBlockNumber}`);
      if (currentChainBlockNumber <= startBlock) {
        logger.info('Has Sync To current block');
        return true;
      }

      while (true) {
        const blockLength = await this.getBlockRange();
        console.log(`Current block length: ${blockLength}`);
        let end = startBlock + blockLength;
        logger.info(`Start push event from block ${startBlock} to ${end}`);
        if (end > currentChainBlockNumber) {
          end = currentChainBlockNumber;
        }
        await this.getLogsThenPushToQueue(startBlock, end, isSaveLogs);
        if (startBlock === end) {
          break;
        }
        startBlock = end;
      }
      console.log('Push event done');
    } catch (err: any) {
      logger.error(
        'blocks ${fromBlock} => ${toBlock} Push event error: ' + err,
      );
      return false;
    }
  }

  pushEventRealTime(isSaveLogs = false) {
    try {
      let count = 0;
      let blockLength = 5;
      let toBlock = 0;
      this._provider.on('block', async (blockNumber) => {
        logger.info(`New block ${blockNumber} detected. Current block length ${blockLength} => need wait ${blockLength - count} blocks more`);
        toBlock = blockNumber;
        count++;
        if (count === blockLength) {
          logger.info("Push event to queue")
          await this.getLogsThenPushToQueue(
            toBlock - blockLength,
            toBlock,
            isSaveLogs,
          );
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
    const haveSyncToLatestBlock = await this.pushEventTransfer(isSaveLogs);
    if (haveSyncToLatestBlock) {
      this.pushEventRealTime(isSaveLogs);
    }
    await sleep(2000);
    this._rabbitMqService.close();
  }
}
