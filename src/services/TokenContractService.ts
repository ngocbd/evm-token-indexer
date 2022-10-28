import {Repository} from 'typeorm';
import {AppDataSource} from '../data-source';
import {TokenContract} from '../entity';
import {DATABASE_SCHEMA} from '../constants';
import logger from '../logger';
import tokenType from "../enums/TokenType";

export default class TokenContractService {
  private readonly tokenContractRepository: Repository<TokenContract>;
  _tableName: string;

  constructor() {
    this.tokenContractRepository = AppDataSource.getRepository(TokenContract);
    this._tableName = 'token_contracts';
  }

  async save(tokenContract: TokenContract): Promise<TokenContract> {
    try {
      const exist = await this.tokenContractRepository.findOne({
        where: {
          address: tokenContract.address,
        },
      });
      if (exist) {
        console.log('exist');
        throw new Error(`the token ${tokenContract.address} existed`);
      }
      return await this.tokenContractRepository.save(tokenContract);
    } catch (err: any) {
      logger.error('[Token service] saved token failed: ' + err.message);
      return null;
    }
  }

  async findAll(): Promise<TokenContract[]> {
    return await this.tokenContractRepository.find();
  }

  async findAllValidErc20(): Promise<string[]> {
    const res = await this.tokenContractRepository.query(`SELECT address FROM ${DATABASE_SCHEMA}.token_contracts WHERE type = ${tokenType.ERC20} AND validated = 1`);
    return res.map((item: any) => item.address);
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
        where: {address},
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
