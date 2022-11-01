import {RabbitMqService} from "../services";
import {sleep} from "../utils";
import {DELETE_DUPLICATE_QUEUE_NAME, TOKEN_BALANCE_QUEUE_NAME} from "../constants";
import logger from "../logger";

export default class PushTransferIDWorker {
  private readonly _rabbitMqService: RabbitMqService;

  constructor() {
    this._rabbitMqService = new RabbitMqService();
  }

  async pushId() {
    const size = 1_000_000;
    let start = 0;
    const end = 1_240_000_000;
    while (start < end) {
      let from = start;
      let to = start + size;

      if (to > end) {
        to = end;
      }
      const message = JSON.stringify({from, to})
      console.log(message)
      await this._rabbitMqService.pushMessage(TOKEN_BALANCE_QUEUE_NAME, message)
      logger.info(`Pushed message ${message}`)
      start = to;
    }
  }

  async run() {
    await this.pushId();
    await sleep(2000)
    this._rabbitMqService.close();
  }
}

