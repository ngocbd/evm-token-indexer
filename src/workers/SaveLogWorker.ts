import { Receiver } from './index';

import { SAVE_LOG_QUEUE_NAME } from '../constants';
import { ethers } from 'ethers';
import TokenLogService from '../services/TokenLogService';
import { TokenLog } from '../entity';
import logger from '../logger';

export default class SaveLogWorker {
  private _receiver: Receiver;
  private _tokenLogService: TokenLogService;
  private _provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._receiver = new Receiver(SAVE_LOG_QUEUE_NAME);
    this._provider = provider;
    this._tokenLogService = new TokenLogService();
  }

  async saveLog(message: string) {
    try {
      const filter: { address: string; fromBlock: number; toBlock: number } =
        JSON.parse(message);
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
      logger.error(err);
    }
  }

  async run() {
    // await this.clearAllData();
    await this._receiver.consumeMessage(this.saveLog.bind(this));
  }
}
