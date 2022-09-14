import {
  RabbitMqService,
  TokenContractService,
  TransactionService,
  TransferEventService,
} from '../services';
import {lastReadBlockRedisKey, SAVE_DATA_QUEUE_NAME} from '../constants';
import {TokenContract, Transaction, TransferEvent} from '../entity';
import {convertFromHexToNumberString, deletePadZero, sleep} from '../utils';
import {BigNumber, ethers, utils} from 'ethers';
import logger from '../logger';
import RedisService from '../services/RedisService';
import TokenType from '../enums/TokenType';

export default class SaveDataWorker {
  _rabbitMqService: RabbitMqService;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _transactionService: TransactionService;
  _provider: ethers.providers.JsonRpcProvider;
  _redisService: RedisService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._rabbitMqService = new RabbitMqService();
    this._tokenContractService = new TokenContractService();
    this._transferEventService = new TransferEventService();
    this._transactionService = new TransactionService();
    this._provider = provider;
    this._redisService = new RedisService();
  }

  async saveTransferEvent(
    transferEvent: ethers.providers.Log,
    token: TokenContract,
  ): Promise<TransferEvent | null> {
    try {
      const toSaveTransferEvent = new TransferEvent();
      toSaveTransferEvent.log_index = transferEvent.logIndex;
      toSaveTransferEvent.tx_hash = transferEvent.transactionHash;
      toSaveTransferEvent.block_number = BigInt(transferEvent.blockNumber);
      toSaveTransferEvent.address = transferEvent.address;

      switch (token.type) {
        case TokenType.ERC20:
          toSaveTransferEvent.tokenType = TokenType.ERC20;
          toSaveTransferEvent.from = deletePadZero(transferEvent.topics[1]);
          toSaveTransferEvent.to = deletePadZero(transferEvent.topics[2]);
          toSaveTransferEvent.amount = convertFromHexToNumberString(transferEvent.data)
          toSaveTransferEvent.token_id = null;
          return await this._transferEventService.save(toSaveTransferEvent);
        case TokenType.ERC721:
          toSaveTransferEvent.tokenType = TokenType.ERC721;
          toSaveTransferEvent.from = deletePadZero(transferEvent.topics[1]);
          toSaveTransferEvent.to = deletePadZero(transferEvent.topics[2]);
          toSaveTransferEvent.amount = '1';
          const tokenId = convertFromHexToNumberString(transferEvent.topics[3]);
          toSaveTransferEvent.token_id = tokenId;
          return await this._transferEventService.save(toSaveTransferEvent);
        case TokenType.ERC1155:
          toSaveTransferEvent.tokenType = TokenType.ERC1155;
          toSaveTransferEvent.from = deletePadZero(transferEvent.topics[2]);
          toSaveTransferEvent.to = deletePadZero(transferEvent.topics[3]);

          const erc1155TransferBatchTopic = utils.id(
            'TransferBatch(address,address,address,uint256[],uint256[])',
          );
          const isTransferBatch =
            transferEvent.topics[0] === erc1155TransferBatchTopic;
          if (isTransferBatch) {
            const [ids, amounts] = utils.defaultAbiCoder.decode(
              ['uint256[]', 'uint256[]'],
              transferEvent.data,
            );
            const idsNumber = ids.map((id) => id.toString());
            const amountsNumber = amounts.map((amount) => amount.toString());
            let res = null;
            for (let i = 0; i < idsNumber.length; i++) {
              const id = idsNumber[i];
              const amount = amountsNumber[i];
              const toSaveCopy = {...toSaveTransferEvent};
              toSaveCopy.token_id = id;
              toSaveCopy.amount = amount;
              res = await this._transferEventService.save(toSaveCopy);
            }
            return res;
          } else {
            const [tokenId, amount] = utils.defaultAbiCoder.decode(
              ['uint256', 'uint256'],
              transferEvent.data,
            );
            toSaveTransferEvent.token_id = tokenId.toString();
            toSaveTransferEvent.amount = amount.toString();
            return await this._transferEventService.save(toSaveTransferEvent);
          }
        case TokenType.UNKNOWN:
          toSaveTransferEvent.tokenType = TokenType.UNKNOWN;
          return null;
      }

      // const res = await this._transferEventService.save(toSaveTransferEvent);
      // return res
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
      const data: {
        transferEvents: any[];
        tokenContract: TokenContract;
        isNewToken: boolean;
      } = JSON.parse(message);
      //save token contract only when it's new
      if (data.isNewToken) {
        const res = await this._tokenContractService.save(data.tokenContract);
        if (res) {
          logger.info(`Saved token contract ${data.tokenContract.address}`);
        }
      }
      let toSaveTxnHash = '';
      for (let i = 0; i < data.transferEvents.length; i++) {
        const transferEvent = data.transferEvents[i];

        const savedTransferEvent = await this.saveTransferEvent(
          transferEvent,
          data.tokenContract,
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
      }
    } catch (err: any) {
      logger.error(`Save data failed for ${message} msg: ${err.message}`);
    }
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
      this.saveData.bind(this),
    );
  }
}
