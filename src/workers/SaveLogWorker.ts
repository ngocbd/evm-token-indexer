import { SAVE_LOG_ERROR_QUEUE_NAME, SAVE_LOG_QUEUE_NAME } from '../constants';
import { ethers } from 'ethers';
import TokenLogService from '../services/TokenLogService';
import { TokenLog } from '../entity';
import logger from '../logger';
import { RabbitMqService } from '../services';

export default class SaveLogWorker {
  private _rabbitMqService: RabbitMqService;
  private _tokenLogService: TokenLogService;
  private _provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._rabbitMqService = new RabbitMqService();
    this._provider = provider;
    this._tokenLogService = new TokenLogService();
  }

  async saveLog(message: string) {
    const filter: { address: string; fromBlock: number; toBlock: number } =
      JSON.parse(message);
    try {
      const logs = await this._provider.getLogs(filter);
      const res = await Promise.all(
        logs.map(async (log) => {
          const tokenLog = new TokenLog();
          tokenLog.log_index = log.logIndex;
          tokenLog.tx_hash = log.transactionHash;
          tokenLog.tx_index = log.transactionIndex;
          tokenLog.block_number = BigInt(log.blockNumber);
          tokenLog.block_hash = log.blockHash;
          tokenLog.address = log.address;
          tokenLog.removed = log.removed;
          tokenLog.data = log.data;
          tokenLog.topics = log.topics.join(',');
          return await this._tokenLogService.save(tokenLog);
        }),
      );
      logger.info(`saved ${res.length} logs`);
    } catch (err) {
      console.log(err);
      //push to error queue
      const errorMsg = JSON.stringify({
        err: err?.message || '',
        fromBlock: filter.fromBlock,
        toBlock: filter.toBlock,
        address: filter.address,
      });
      await this._rabbitMqService.pushMessage(
        SAVE_LOG_ERROR_QUEUE_NAME,
        errorMsg,
      );
      logger.info(`Push ${errorMsg} to error queue`);
      logger.error(err);
    }
  }

  async run() {
    await this._rabbitMqService.consumeMessage(
      SAVE_LOG_QUEUE_NAME,
      undefined,
      this.saveLog.bind(this),
    );
  }
}
