import { Repository } from 'typeorm';
import { TokenLog, TransferEvent } from '../entity';
import { AppDataSource } from '../data-source';

export default class TokenLogService {
  private readonly transferEventRepository: Repository<TokenLog>;

  constructor() {
    this.transferEventRepository = AppDataSource.getRepository(TokenLog);
  }

  async save(tokenLog: TokenLog): Promise<TokenLog> {
    return await this.transferEventRepository.save(tokenLog);
  }
}
