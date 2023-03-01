import { ethers } from "ethers";
import { CounterService, RabbitMqService, TokenContractService, TransferEventService } from "../services";
import { TokenContract, TransferEvent } from "../entity";
import { SAVE_TOKEN_BALANCE_QUEUE_NAME, SAVE_TRANSFER_EVENT_ERROR_QUEUE_NAME, SAVE_TRANSFER_EVENT_QUEUE_NAME } from "../constants";
import logger from "../logger";
import CounterName from "../enums/CounterName";
import { measurePromise } from '../utils/index';

export default class SaveTransferEventWorker {
  _rabbitMqService: RabbitMqService;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _provider: ethers.providers.JsonRpcProvider;
  _counterService: CounterService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._rabbitMqService = new RabbitMqService();
    this._transferEventService = new TransferEventService();
    this._counterService = new CounterService();
  }

  async saveData(msg: string) {
    try {
      const data: { transferEvent: ethers.providers.Log, token: TokenContract } = JSON.parse(msg);
      const start = Date.now();
      //IMPORTANT: just save transaction hash
      const res: any = await this._transferEventService.saveBaseOnToken(data.transferEvent, data.token)
      const end = Date.now();
      console.log(`Saved transfer event at ${data.transferEvent.transactionHash} took ${end - start} ms`);
      await this._counterService.setCounter(CounterName.BLOCK_NUMBER, data.transferEvent.blockNumber)
      if (!res) {
        logger.error(`Failed to save transfer event ${data.transferEvent.transactionHash}`);
        return;
      }

      //push message to save balance worker
      if (Array.isArray(res)) {
        for (let j = 0; j < res.length; j++) {
          const savedEvent = res[j];
          await this._rabbitMqService.pushMessage(
            SAVE_TOKEN_BALANCE_QUEUE_NAME,
            JSON.stringify({
              token: data.token,
              transferEvent: savedEvent,
            }),
          );
          logger.info(
            `Saved Pushed transfer event ${savedEvent.tx_hash} to save token balance queue`,
          );
        }
      } else {
        await this._rabbitMqService.pushMessage(
          SAVE_TOKEN_BALANCE_QUEUE_NAME,
          JSON.stringify({
            token: data.token,
            transferEvent: res,
          }),
        );
        logger.info(
          `Saved and Pushed transfer event ${res.tx_hash} to save token balance queue`,
        );
      }
    } catch (err) {
      logger.error(`Save transfer events failed msg: ${err.message}`);
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      SAVE_TRANSFER_EVENT_QUEUE_NAME,
      4_000,
      this.saveData.bind(this),
    );
  }
}





