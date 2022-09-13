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
      await this._rabbitMqService.pushMessage(
        PUSH_EVENT_ERROR_QUEUE_NAME,
        errorMsg,
      );
      logger.info(`Push ${errorMsg} to error queue`);
      return null;
    }
  }

  async pushEventTransfer(isSaveLogs: boolean) {
    const blockLength = 100;
    try {

      const currentChainBlockNumber = await this._provider.getBlockNumber();

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

          await this._rabbitMqService.pushMessage(
            EVENT_TRANSFER_QUEUE_NAME,
            message,
          );
          logger.info(
            `Push ${events.length} events of token ${events[0].address} to queue`,
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
            logger.info(`Push ${logQueueMsg} to log queue`);
          }
        }
        transferEventsMap.clear();


      }
    } catch (err: any) {
      logger.error('Push event error: ' + err);
    }
  }

  async testPushEventTransfer(fromBlock, toBlock) {
    try {
      const startTime1 = new Date().getTime();
      const transferEventsMap = new Map<string, unknown[]>();

      const transferEventLogs = await this.getTransferLogs(fromBlock, toBlock);
      if (!transferEventLogs) {
        return;
      }
      console.log(
        `blocks ${fromBlock} => ${toBlock} transfer event count:  ${transferEventLogs.length}`,
      );
      const endTime1 = new Date().getTime();

      const startTime2 = new Date().getTime();
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
      const endTime2 = new Date().getTime();

      const startTime3 = new Date().getTime();
      const currentCursor = transferEventsMap.values();
      while (true) {
        const result = currentCursor.next();
        if (result.done) {
          break;
        }
        const events = result.value;
        // const message = JSON.stringify(events);
        await this._rabbitMqService.pushMessage('test', 'message');
        logger.info(
          `Push ${events.length} events of token ${events[0].address} to queue`,
        );
        //push to save log queue only when this queue has receivers


        const logQueueMsg = JSON.stringify({
          address: events[0].address,
          fromBlock,
          toBlock,
        });
        await this._rabbitMqService.pushMessage('test-log', 'test');
        logger.info(`Push ${logQueueMsg} to log queue`);
      }
      //update cached
      // await this._redisService.setValue(lastReadBlockRedisKey, toBlock);

      const endTime3 = new Date().getTime();
      this._rabbitMqService.close();
      console.log('get logs time: ', endTime1 - startTime1);
      console.log('parse logs time: ', endTime2 - startTime2);
      console.log('push logs time: ', endTime3 - startTime3);
      console.log('total time: ', endTime3 - startTime1);
    } catch (err: any) {
      logger.error('Push event error: ' + err);
    }
  }

  async run(isSaveLogs = true) {
    console.log(
      `Start push event transfer with save logs option: ${isSaveLogs}`,
    );
    await this.pushEventTransfer(isSaveLogs);
    this._rabbitMqService.close();
  }
}
