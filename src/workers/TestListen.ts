import {RabbitMqService, TransactionService} from "../services";
import {getQueueName} from "../constants";

class TestListen {

  _rabbitMqService: RabbitMqService;
  _transactionService: TransactionService;
  _tuple = [];


  constructor() {
    this._rabbitMqService = new RabbitMqService();
    this._transactionService = new TransactionService();

  }

  mergeQueue(msg) {
    this._tuple.push(msg);
    if (this._tuple.length == 3) {
      console.log(this._tuple);
      this._tuple = [];
    }
  }

  async saveData(msg: string) {
    console.log("receive message: ", msg);
    this.mergeQueue(msg);


  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      getQueueName().TEST_QUEUE_NAME,
      2,
      this.saveData.bind(this),
    );
  }
}

export default TestListen;

