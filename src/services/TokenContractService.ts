import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { TokenContract } from '../entity';
import { DATABASE_SCHEMA } from '../constants';
import logger from '../logger';

export default class TokenContractService {
  private readonly tokenContractRepository: Repository<TokenContract>;
  _tableName: string;

  constructor() {
    this.tokenContractRepository = AppDataSource.getRepository(TokenContract);
    this._tableName = 'token_contracts';
  }

  async save(tokenContract: TokenContract): Promise<TokenContract> {
    return await this.tokenContractRepository.save(tokenContract);
  }

  async findAll(): Promise<TokenContract[]> {
    return await this.tokenContractRepository.find();
  }

  async getLatestBlockInDb(): Promise<number> {
    try {
      const queryRunner = await AppDataSource.createQueryRunner();
      const result = await queryRunner.manager.query(
        `SELECT MAX(block_number) FROM ${DATABASE_SCHEMA}.${this._tableName}`,
      );
      return result[0].max || 0;
    } catch (err: any) {
      logger.error('Error when get latest block');
      return 0;
    }
  }

  async findByAddress(address: string): Promise<TokenContract> {
    try {
      return await this.tokenContractRepository.findOne({
        where: { address },
      });
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async deleteAll(): Promise<void> {
    await this.tokenContractRepository.clear();
  }
}
