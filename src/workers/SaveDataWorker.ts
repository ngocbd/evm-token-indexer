import { Receiver } from './index';
import { TokenContractService } from '../services';
import { SAVE_DATA_QUEUE_NAME } from '../constants';
import { TokenContract } from '../entity';

export default class SaveDataWorker {
  _receiver: Receiver;
  _tokenContractService: TokenContractService;

  constructor() {
    this._receiver = new Receiver(SAVE_DATA_QUEUE_NAME);
    this._tokenContractService = new TokenContractService();
  }

  async saveData(message: string) {
    const data = JSON.parse(message);
    const tokenType = data.tokenType;
    const tokenAddress = data.transferEvents[0].address;
    const tokenContract = new TokenContract();
    tokenContract.type = tokenType;
    tokenContract.address = tokenAddress;
    const saved = await this._tokenContractService.save(tokenContract);
    console.log('saved: ', saved);
  }

  async run() {
    await this._receiver.consumeMessage(this.saveData.bind(this));
  }
}
