import {ethers, utils} from 'ethers';
import {Publisher} from './index';
import {EVENT_TRANSFER_QUEUE_NAME} from '../constants';
import logger from '../logger';

export default class PushEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _publisher: Publisher;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._publisher = new Publisher(EVENT_TRANSFER_QUEUE_NAME);
  }

  async getTransferEvents(fromBlock: number, toBlock: number) {
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
      console.log('transfer event count: ', transferEventLogs.length);
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
        await this._publisher.pushMessage(message);
        logger.info(
          `Push ${events.length} events of token ${events[0].address} to queue`,
        );
      }
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

  //for demo purposes need to pass from and to block number
  //TODO: check last push block number from db or from queue
  async run(fromBlock: number, toBlock: number) {
    console.log('PushEventWorker is running');
    await this.getTransferEvents(fromBlock, toBlock);
  }
}
