import {RabbitMqService, TokenContractService} from "../services";
import {CRAWL_TOKEN_HOLDER_QUEUE_NAME, DELETE_DUPLICATE_QUEUE_NAME} from "../constants";
import logger from "../logger";
import {sleep} from "../utils";

export default class PushTokenForCrawler {
  _rabbitMqService: RabbitMqService;
  _tokenContractService: TokenContractService;

  constructor() {
    this._rabbitMqService = new RabbitMqService();
    this._tokenContractService = new TokenContractService();
  }

  async pushToken() {
    const tokens = await this._tokenContractService.findAllValidErc20();
    logger.info(`Push ${tokens.length} tokens to queue ${CRAWL_TOKEN_HOLDER_QUEUE_NAME}`);
    for (const token of tokens) {
      const message = token;
      await this._rabbitMqService.pushMessage(CRAWL_TOKEN_HOLDER_QUEUE_NAME, message);
      logger.info(`Pushed message ${message}`);
    }
  }

  async run() {
    await this.pushToken();
    await sleep(2000)
    this._rabbitMqService.close();
  }

}