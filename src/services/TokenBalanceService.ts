import { Repository } from 'typeorm';
import {TokenBalance, TokenLog} from '../entity';
import { AppDataSource } from '../data-source';
import logger from "../logger";

export default class TokenBalanceService {
  private readonly tokenBalanceRepository: Repository<TokenBalance>;

  constructor() {
    this.tokenBalanceRepository = AppDataSource.getRepository(TokenBalance);
  }

  async save(tokenBalance: TokenBalance): Promise<TokenBalance> {
   try {
     return await this.tokenBalanceRepository.save(tokenBalance);
   } catch (err: any) {
     logger.error('[Token service] saved token failed: ' + err.message);
     return null;
   }
  }

  async findByTokenAndOwner(token: string, owner): Promise<TokenBalance> {
    try {
      return await this.tokenBalanceRepository.findOne({
        where: {token, owner},
      });
    } catch (err: any) {
      logger.error('[Token service] find token failed: ' + err.message);
      return null;
    }
  }
}
