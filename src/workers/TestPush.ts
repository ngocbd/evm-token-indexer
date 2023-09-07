import {RabbitMqService} from "../services";
import {getQueueName} from "../constants";


export default class TestPush {
  _rabbitMqService: RabbitMqService;

  constructor() {
    this._rabbitMqService = new RabbitMqService();
  }

  async run() {
    for (let i = 0; i < 100; i++) {
      await this._rabbitMqService.pushMessage(getQueueName().TEST_QUEUE_NAME, `test ${i}`);
      console.log(`pushed: test ${i}`);

    }

  }
}
