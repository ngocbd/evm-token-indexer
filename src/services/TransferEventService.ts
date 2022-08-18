import { Repository } from 'typeorm';
import { TransferEvent } from '../entity';
import { AppDataSource } from '../data-source';

export default class TransferEventService {
  private readonly transferEventRepository: Repository<TransferEvent>;

  constructor() {
    this.transferEventRepository = AppDataSource.getRepository(TransferEvent);
  }

  async save(transferEvent: TransferEvent): Promise<TransferEvent> {
    return await this.transferEventRepository.save(transferEvent);
  }

  async deleteAll() {
    return await this.transferEventRepository.clear();
  }
}
