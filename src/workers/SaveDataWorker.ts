import {Receiver} from './index';
import {
  TokenContractService,
  TransactionService,
  TransferEventService,
} from '../services';
import {SAVE_DATA_QUEUE_NAME} from '../constants';
import {TokenContract, Transaction, TransferEvent} from '../entity';
import {deletePadZero} from '../utils';
import {BigNumber, ethers} from 'ethers';

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

  async saveTransferEvent(transferEvent: ethers.providers.Log, tokenAddress: string): Promise<TransferEvent | null> {

    try {
      const toSaveTransferEvent = new TransferEvent();
      toSaveTransferEvent.log_index = transferEvent.logIndex;
      toSaveTransferEvent.tx_hash = transferEvent.transactionHash;
      toSaveTransferEvent.block_number = BigInt(transferEvent.blockNumber);
      toSaveTransferEvent.address = transferEvent.address;
      toSaveTransferEvent.from = deletePadZero(transferEvent.topics[1]);
      toSaveTransferEvent.to = deletePadZero(transferEvent.topics[2]);
      toSaveTransferEvent.token_id = tokenAddress;
      let amount = ""
      try {
        amount = BigNumber.from(
          transferEvent.data,
        ).toString();
      } catch (convertError) {
        amount = transferEvent.data;
      }
      toSaveTransferEvent.amount = amount
      const res = await this._transferEventService.save(
        toSaveTransferEvent,
      );
      return res
    } catch (err: any) {
      console.log(`Save transfer event failed for ${transferEvent.transactionHash} msg: ${err.message}`);
      return null;
    }
  }

  async saveTransaction(transaction: ethers.providers.TransactionResponse) {
    try {
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
      console.log(`Save transaction failed for ${transaction.hash} msg: ${err.message}`);
      return null;
    }
  }

  async saveData(message: string) {
    try {
      const data: { transferEvents: any; tokenType: any, isNewToken: boolean } = JSON.parse(message);
      const tokenType = data.tokenType;
      const tokenAddress = data.transferEvents[0].address;
      let tokenContract = new TokenContract();
      tokenContract.type = tokenType;
      tokenContract.address = tokenAddress;
      if (data.isNewToken) {
        tokenContract = await this._tokenContractService.save(tokenContract);
      }
      //save data
      let transactionHash = '';
      const res = await Promise.all(
        data.transferEvents.map(async (transferEvent: any) => {
          try {
            const savedTransferEvent = await this.saveTransferEvent(transferEvent, tokenContract.address);

            const transaction = await this._provider.getTransaction(
              transferEvent.transactionHash,
            );
            if (!transaction) {
              throw new Error(`Transaction not found for ${transferEvent.transactionHash}`)
            }
            const eventTxHash = transaction.hash;
            //save transaction only when it is not saved yet
            let savedTransaction: Transaction
            if (eventTxHash !== transactionHash) {
              transactionHash = eventTxHash;
              savedTransaction = await this.saveTransaction(transaction);
            }
            return {
              savedTransferEvent,
              savedTransaction,
            }
          } catch (err) {
            console.log(`Saved data failed for transfer event at txn ${transferEvent.transactionHash} msg: ${err.message}`);
            return null;
          }
        }),
      );

      console.log(`transfer events record saved: ${res.filter((x: any) => x && x.savedTransferEvent).length}`);
      console.log(`transactions record saved: ${res.filter((x: any) => x && x.savedTransaction).length}`);

    } catch (err: any) {
      console.log(`Save token contract failed: `,err);
    }
  }

  async clearAllData() {
    await this._tokenContractService.deleteAll();
    await this._transferEventService.deleteAll();
    await this._transactionService.deleteAll();
  }

  async run() {
    await this._receiver.consumeMessage(this.saveData.bind(this));
  }
}
