import { Receiver } from './index';
import {
  TokenContractService,
  TransactionService,
  TransferEventService,
} from '../services';
import { SAVE_DATA_QUEUE_NAME } from '../constants';
import { TokenContract, Transaction, TransferEvent } from '../entity';
import { deletePadZero, sleep } from '../utils';
import { BigNumber, ethers } from 'ethers';
import logger from '../logger';

export default class SaveDataWorker {
  _receiver: Receiver;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _transactionService: TransactionService;
  _provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._receiver = new Receiver(SAVE_DATA_QUEUE_NAME);
    this._tokenContractService = new TokenContractService();
    this._transferEventService = new TransferEventService();
    this._transactionService = new TransactionService();
    this._provider = provider;
  }

  async saveTransferEvent(
    transferEvent: ethers.providers.Log,
    tokenAddress: string,
  ): Promise<TransferEvent | null> {
    try {
      //fallback value when failed to get data
      const toSaveTransferEvent = new TransferEvent();
      toSaveTransferEvent.log_index = transferEvent.logIndex;
      toSaveTransferEvent.tx_hash = transferEvent.transactionHash;
      toSaveTransferEvent.block_number = BigInt(transferEvent.blockNumber);
      toSaveTransferEvent.address = transferEvent.address;
      toSaveTransferEvent.from = deletePadZero(transferEvent.topics[1]);
      toSaveTransferEvent.to = deletePadZero(transferEvent.topics[2]);
      toSaveTransferEvent.token_id = tokenAddress;
      let amount = '';
      try {
        amount = BigNumber.from(transferEvent.data).toString();
      } catch (convertError) {
        //this happen when non erc20 token is transferred
        amount = transferEvent.data;
      }
      toSaveTransferEvent.amount = amount;
      const res = await this._transferEventService.save(toSaveTransferEvent);
      return res;
    } catch (err: any) {
      logger.error(
        `Save transfer event failed for ${transferEvent.transactionHash} msg: ${err.message}`,
      );
      return null;
    }
  }

  async saveTransaction(
    transactionHash: string,
    maxRetries = 3,
    retryTime = 1000,
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
      const data: {
        transferEvents: any;
        tokenContract: TokenContract;
        isNewToken: boolean;
      } = JSON.parse(message);
      //save token contract only when it's new
      if (data.isNewToken) {
        await this._tokenContractService.save(data.tokenContract);
        logger.info(`Saved token contract ${data.tokenContract.address}`);
      }

      let toSaveTxnHash = '';
      await Promise.all(
        data.transferEvents.map(async (transferEvent: any) => {
          try {
            const savedTransferEvent = await this.saveTransferEvent(
              transferEvent,
              data.tokenContract.address,
            );
            const currentEventTxnHash = transferEvent.transactionHash;

            //save transaction only when it is not saved yet
            let savedTransaction: Transaction;
            if (currentEventTxnHash !== toSaveTxnHash) {
              toSaveTxnHash = currentEventTxnHash;
              savedTransaction = await this.saveTransaction(toSaveTxnHash);
            }
            if (savedTransaction) {
              logger.info(`Saved transaction ${savedTransaction.tx_hash}`);
            }
            if (savedTransferEvent) {
              logger.info(
                `Saved transfer event ${savedTransferEvent.tx_hash} log_index: ${savedTransferEvent.log_index}`,
              );
            }
          } catch (err) {
            logger.error(
              `Saved txn and transfer event promise failed at txn ${transferEvent.transactionHash} log_index: ${transferEvent.logIndex} msg: ${err.message}`,
            );
          }
        }),
      );
    } catch (err: any) {
      logger.error(`Save data failed for ${message} msg: ${err.message}`);
    }
  }

  //IMPORTANT: this method will delete all data in the database
  async clearAllData() {
    await this._tokenContractService.deleteAll();
    await this._transferEventService.deleteAll();
    await this._transactionService.deleteAll();
  }

  async run() {
    // await this.clearAllData();
    await this._receiver.consumeMessage(this.saveData.bind(this));
  }
}
