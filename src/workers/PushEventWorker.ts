import {ethers, utils} from 'ethers';
import {Publisher} from './index';
import {EVENT_TRANSFER_QUEUE_NAME} from '../constants';
import logger from '../logger';
import {TokenContractService, TransferEventService} from '../services';
import RedisService from "../services/RedisService";

export default class PushEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _publisher: Publisher;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _firstRecognizedTokenBlock: number;
  _redisService: RedisService
  _lastReadBlockRedisKey: string

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._publisher = new Publisher(EVENT_TRANSFER_QUEUE_NAME);
    this._tokenContractService = new TokenContractService();
    this._firstRecognizedTokenBlock = 980_743;
    this._redisService = new RedisService();
    this._transferEventService = new TransferEventService()
    this._lastReadBlockRedisKey = 'evm-push-event-worker-last-read-block'
  }

  /*
* Detect start block
* if cached exist use cached block number
* else if latest block in db > first recognized block use block in db
* else use first recognized block
* */
  private async _detectStartBlock(): Promise<number> {
    const cachedBlock = await this._redisService.getValue(this._lastReadBlockRedisKey);
    if (cachedBlock !== null) {
      return parseInt(cachedBlock)
    }
    const inDbBlock = await this._transferEventService.getHighestBlock();
    return inDbBlock > this._firstRecognizedTokenBlock ? inDbBlock : this._firstRecognizedTokenBlock
  }

  async getTransferEvents() {

    const blockLength = 1000;
    try {
      await this._redisService.init();
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
      const startBlock = await this._detectStartBlock()
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
          //update cached
          await this._redisService.setValue(this._lastReadBlockRedisKey, toBlock)
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
