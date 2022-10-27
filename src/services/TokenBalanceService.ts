import { Repository } from 'typeorm';
import {TokenBalance, TokenLog} from '../entity';
import { AppDataSource } from '../data-source';

export default class TokenBalanceService {
  private readonly tokenBalanceRepository: Repository<TokenBalance>;

  constructor() {
    this.tokenBalanceRepository = AppDataSource.getRepository(TokenBalance);
  }

  async save(tokenBalance: TokenBalance): Promise<TokenBalance> {
    return await this.tokenBalanceRepository.save(tokenBalance);
  }
}
