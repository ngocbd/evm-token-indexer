import {RabbitMqService, TokenContractService, TransactionService, TransferEventService} from "../services";
import {ethers} from "ethers";
import RedisService from "../services/RedisService";
import {Transaction} from "../entity";
import logger from "../logger";
import {sleep} from "../utils";
import {SAVE_DATA_QUEUE_NAME, SAVE_TRANSACTION_QUEUE_NAME} from "../constants";

export default class SaveTransactionWorker {
  _rabbitMqService: RabbitMqService;
  _transactionService: TransactionService;
  _provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._rabbitMqService = new RabbitMqService();
    this._transactionService = new TransactionService();
    this._provider = provider;
  }

  async saveTransaction(
    transactionHash: string,
    maxRetries = 3,
    retryTime = 100,
  ): Promise<Transaction | null> {
    try {
      const transaction = await this._provider.getTransaction(transactionHash);
      const toSaveTransaction = new Transaction();
      toSaveTransaction.tx_hash = transaction.hash;
      toSaveTransaction.block_number = BigInt(transaction.blockNumber);
      toSaveTransaction.gasPrice = transaction.gasPrice.toString();
      toSaveTransaction.nonce = BigInt(transaction.nonce);
      toSaveTransaction.to = transaction.to;
      toSaveTransaction.value = transaction.value.toString();
      toSaveTransaction.data = transaction.data;
      toSaveTransaction.from = transaction.from;
      const signature =
        transaction.r.slice(2) +
        transaction.s.slice(2) +
        transaction.v.toString();
      toSaveTransaction.signature = signature;
      return await this._transactionService.save(toSaveTransaction);
    } catch (err: any) {
      if (maxRetries > 0) {
        logger.warn(
          `Save transaction failed for ${transactionHash} msg: ${err.message} retrying...`,
        );
        await sleep(retryTime);
        return this.saveTransaction(transactionHash, maxRetries - 1, retryTime);
      }
      //if max retries is reached, save only txn hash
      try {
        const toSaveTransaction = new Transaction();
        toSaveTransaction.tx_hash = transactionHash;
        toSaveTransaction.block_number = BigInt(-1);
        toSaveTransaction.gasPrice = '-1';
        toSaveTransaction.nonce = BigInt(-1);
        toSaveTransaction.to = '0x';
        toSaveTransaction.value = '0x';
        toSaveTransaction.data = '0x';
        toSaveTransaction.signature = '';
        return await this._transactionService.save(toSaveTransaction);
      } catch (err2) {
        logger.error(
          `Save transaction failed for ${transactionHash} msg: ${err2.message} `,
        );
      }
    }
  }

  async saveData(message: string) {
    try {
      const res = await this.saveTransaction(message);
      if(res) {
        logger.info(`Saved transaction ${message}`);
      }
    }catch (err) {
      logger.error(`Save txn failed for ${message} msg: ${err.message}`);
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      SAVE_TRANSACTION_QUEUE_NAME,
      500,
      this.saveData.bind(this)
    );
  }
}