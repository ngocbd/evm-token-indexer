import { Receiver } from './index';
import {
  TokenContractService,
  TransactionService,
  TransferEventService,
} from '../services';
import { SAVE_DATA_QUEUE_NAME } from '../constants';
import { TokenContract, Transaction, TransferEvent } from '../entity';
import { deletePadZero } from '../utils';
import { BigNumber, ethers } from 'ethers';

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

  async saveData(message: string) {
    try {
      const data: { transferEvents: any; tokenType: any } = JSON.parse(message);
      const tokenType = data.tokenType;
      const tokenAddress = data.transferEvents[0].address;
      const tokenContract = new TokenContract();
      tokenContract.type = tokenType;
      tokenContract.address = tokenAddress;
      const saved = await this._tokenContractService.save(tokenContract);
      //save transfer event
      let transactionHash = '';
      const res = await Promise.all(
        data.transferEvents.map(async (transferEvent: any) => {
          try {
            const toSaveTransferEvent = new TransferEvent();
            toSaveTransferEvent.log_index = transferEvent.logIndex;
            toSaveTransferEvent.tx_hash = transferEvent.transactionHash;
            toSaveTransferEvent.block_number = transferEvent.blockNumber;
            toSaveTransferEvent.address = transferEvent.address;
            toSaveTransferEvent.from = deletePadZero(transferEvent.topics[1]);
            toSaveTransferEvent.to = deletePadZero(transferEvent.topics[2]);
            toSaveTransferEvent.token_id = saved.address;
            toSaveTransferEvent.amount = BigNumber.from(
              transferEvent.data,
            ).toString();
            const res = await this._transferEventService.save(
              toSaveTransferEvent,
            );
            const transaction = await this._provider.getTransaction(
              transferEvent.transactionHash,
            );
            const eventTxHash = transaction.hash;
            //save transaction only when it is not saved yet
            if (eventTxHash !== transactionHash) {
              transactionHash = eventTxHash;
              const toSaveTransaction = new Transaction();
              toSaveTransaction.tx_hash = eventTxHash;
              toSaveTransaction.block_number = transferEvent.blockNumber;
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
              await this._transactionService.save(toSaveTransaction);
            }

            return res;
          } catch (err) {
            console.log(err.message);
            return null;
          }
        }),
      );

      console.log(res);

      console.log('saved: ', saved);
    } catch (err: any) {
      console.log(err);
    }
  }

  async run() {
    //for demo only
    await this._tokenContractService.deleteAll();
    await this._transferEventService.deleteAll();
    await this._transactionService.deleteAll();
    await this._receiver.consumeMessage(this.saveData.bind(this));
  }
}
