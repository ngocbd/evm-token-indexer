import {Repository} from "typeorm";
import {TransferEvent} from "../entity";
import {AppDataSource} from "../data-source";

export default class TransferEventService {
  private readonly transferEventRepository: Repository<TransferEvent>;

  constructor() {
    this.transferEventRepository = AppDataSource.getRepository(TransferEvent);
  }

  async save(transferEvent: TransferEvent): Promise<TransferEvent> {
    try {
      //throw error when pk existed if not typeorm auto update
      const exist = await this.transferEventRepository.findOneBy({
        tx_hash: transferEvent.tx_hash,
        log_index: transferEvent.log_index
      })
      if (exist) {
        throw new Error(
          `The transfer event with tx_hash ${transferEvent.tx_hash} and log_index ${transferEvent.log_index} already exists`,
        );
      }
      return await this.transferEventRepository.save(transferEvent);
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async deleteAll() {
    return await this.transferEventRepository.clear();
  }
}