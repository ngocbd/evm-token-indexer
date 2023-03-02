import { RabbitMqService } from "../services";
import { TEST_QUEUE_NAME } from '../constants/index';

export default class TestPush {
    _rabbitMqService: RabbitMqService;
  
    constructor() {
      this._rabbitMqService = new RabbitMqService();
    }

    async run() {
        for(let i = 0; i < 100; i++) {
            await this._rabbitMqService.pushMessage(TEST_QUEUE_NAME, `test ${i}`);
            console.log(`pushed: test ${i}`);
            
        }

    }
}