import { Repository } from 'typeorm';
import { Erc1155Balance, Erc20Balance, Erc721Balance, TokenBalance, TokenLog } from '../entity';
import { AppDataSource } from '../data-source';
import logger from "../logger";

export default class TokenBalanceService {
  private readonly tokenBalanceRepository: Repository<TokenBalance>;
  private readonly erc20BalanceRepository: Repository<Erc20Balance>;
  private readonly erc721BalanceRepository: Repository<Erc721Balance>;
  private readonly erc1155BalanceRepository: Repository<Erc1155Balance>;

  constructor() {
    this.tokenBalanceRepository = AppDataSource.getRepository(TokenBalance);
    this.erc20BalanceRepository = AppDataSource.getRepository(Erc20Balance);
    this.erc721BalanceRepository = AppDataSource.getRepository(Erc721Balance);
    this.erc1155BalanceRepository = AppDataSource.getRepository(Erc1155Balance);
  }

  async save(tokenBalance: TokenBalance): Promise<TokenBalance> {
    try {
      return await this.tokenBalanceRepository.save(tokenBalance);
    } catch (err: any) {
      logger.error('[Token service] saved token failed: ' + err.message);
      return null;
    }
  }

  async saveErc20Balance(erc20Balance: Erc20Balance) {

    return await this.erc20BalanceRepository.save(erc20Balance, {
      transaction: false,
    });
  }

  async saveErc721Balance(erc721Balance: Erc721Balance) {
    return await this.erc721BalanceRepository.save(erc721Balance, {
      transaction: false,
    });
  }

  async saveErc1155Balance(erc1155Balance: Erc1155Balance): Promise<Erc1155Balance> {
    try {
     return await this.erc1155BalanceRepository.save(erc1155Balance, {
        transaction: false,
     });
    } catch (err) {
      console.log(err)
      return null;
    }
  }

  async findErc1155BalanceByTokenAndOwner(token: string, owner): Promise<Erc1155Balance[]> {
    try {
      const balance = await this.erc1155BalanceRepository.find({
        where: { token, owner },
      });
      return balance
    } catch (err) {
      logger.error('[Token service] find errc1155 token failed: ' + err.message);
      return null;
    }
  }

  async findErc721BalanceByTokenAndOwner(token: string, owner): Promise<Erc721Balance> {
    try {
      return await this.erc721BalanceRepository.findOne({
        where: { token, owner },
      });
    } catch (err: any) {
      logger.error('[Token service] find token failed: ' + err.message);
      return null;
    }
  }

  async findByTokenAndOwner(token: string, owner): Promise<TokenBalance> {
    try {
      return await this.tokenBalanceRepository.findOne({
        where: { token, owner },
      });
    } catch (err: any) {
      logger.error('[Token service] find token failed: ' + err.message);
      return null;
    }
  }
}
