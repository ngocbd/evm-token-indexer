import {
  CounterService,
  RabbitMqService,
  TokenContractService,
  TransactionService,
  TransferEventService,
} from '../services';
import {
  lastReadBlockRedisKey,
  SAVE_DATA_QUEUE_NAME,
  SAVE_TOKEN_BALANCE_QUEUE_NAME,
  SAVE_TRANSACTION_QUEUE_NAME,
  SAVE_TRANSFER_EVENT_QUEUE_NAME,
} from '../constants';
import { TokenContract } from '../entity';
import { ethers } from 'ethers';
import logger from '../logger';
import RedisService from '../services/RedisService';
import TokenType from '../enums/TokenType';
import CounterName from '../enums/CounterName';

export default class SaveTokenWorker {
  _rabbitMqService: RabbitMqService;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _transactionService: TransactionService;
  _provider: ethers.providers.JsonRpcProvider;
  _redisService: RedisService;
  _counterService: CounterService;
  private readonly RECORD_PER_MESSAGE = 20;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._rabbitMqService = new RabbitMqService();
    this._tokenContractService = new TokenContractService();
    this._transferEventService = new TransferEventService();
    this._transactionService = new TransactionService();
    this._provider = provider;
    this._redisService = new RedisService();
    this._counterService = new CounterService();
  }
  async saveData(message: string) {
    try {
      const data: {
        transferEvents: any[];
        tokenContract: TokenContract;
        isNewToken: boolean;
      } = JSON.parse(message);
      //save token contract only when it's new
      const startSavceTokenContract = new Date().getTime();
      if (data.isNewToken) {
        const res = await this._tokenContractService.save(data.tokenContract);
        if (res) {
          logger.info(`Saved token contract ${data.tokenContract.address}`);
        }
      }
      const endSaveTokenContract = new Date().getTime();
      console.log(`Save token contract took ${endSaveTokenContract - startSavceTokenContract} ms`);

      let toSaveTxnHash = '';
      for (let i = 0; i < data.transferEvents.length; i++) {
        const transferEvent = data.transferEvents[i];
        const pushMsq = JSON.stringify({
          transferEvent,
          token: data.tokenContract,
        })
        await this._rabbitMqService.pushMessage(SAVE_TRANSFER_EVENT_QUEUE_NAME, pushMsq);
        logger.info(`Pushed transfer event ${transferEvent.transactionHash} to save transfer event queue`);

        const currentEventTxnHash = transferEvent.transactionHash;

        //save transaction only when it is not saved yet
        if (currentEventTxnHash !== toSaveTxnHash) {
          toSaveTxnHash = currentEventTxnHash;
          await this._rabbitMqService.pushMessage(SAVE_TRANSACTION_QUEUE_NAME, toSaveTxnHash);
          logger.info(`Pushed transaction ${toSaveTxnHash} to save txn queue`);
        }
      }
    } catch (err: any) {
      logger.error(`Save data failed for ${message} msg: ${err.message}`);
    }
    console.log('end');
  }
  //IMPORTANT: this method will delete all data in the database
  async clearAllData() {
    await this._tokenContractService.deleteAll();
    await this._transferEventService.deleteAll();
    await this._transactionService.deleteAll();
    await this._redisService.init();
    await this._redisService.setValue(lastReadBlockRedisKey, 0);
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      SAVE_DATA_QUEUE_NAME,
      2000,
      this.saveData.bind(this),
    );
  }
}
