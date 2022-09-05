import { Receiver } from './index';

import { SAVE_DATA_QUEUE_NAME } from '../constants';

export default class SaveLogWorker {
  private _receiver: Receiver;

  // private _provider: ethers.providers.JsonRpcProvider;

  constructor() {
    this._receiver = new Receiver(SAVE_DATA_QUEUE_NAME);
    // this._provider = provider
  }

  async consume(message: string) {
    console.log(message);
  }

  async run() {
    // await this.clearAllData();
    await this._receiver.consumeMessage(this.consume.bind(this));
  }
}
