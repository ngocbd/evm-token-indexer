import {RabbitMqService, TransferEventService} from '../services';
import RedisService from '../services/RedisService';
import {sleep} from "../utils";
import logger from "../logger";
import {DELETE_DUPLICATE_QUEUE_NAME} from "../constants";

export default class PushDeletePageWorker {
  _rabbitMqService: RabbitMqService;
  _transferEventService: TransferEventService;

  constructor() {
    this._rabbitMqService = new RabbitMqService();
    this._transferEventService = new TransferEventService();
  }


  async pushPage() {
    const deletePerPage = 100_000
    let startOffset = 0;
    const endOffset = 1_240_000_000
    while (startOffset < endOffset) {
      startOffset += deletePerPage
      if(startOffset > endOffset) {
        startOffset = endOffset
      }
      const message = JSON.stringify({startOffset, deletePerPage})
      await this._rabbitMqService.pushMessage(DELETE_DUPLICATE_QUEUE_NAME, message)
      logger.info(`Pushed message ${message}`)
    }
  }


  async run(isSaveLogs = true) {
    await this.pushPage();
    await sleep(2000)
    this._rabbitMqService.close();
  }
}
