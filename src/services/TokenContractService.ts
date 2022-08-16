import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { TokenContract } from '../entity';

export default class TokenContractService {
  private readonly tokenContractRepository: Repository<TokenContract>;

  constructor() {
    this.tokenContractRepository = AppDataSource.getRepository(TokenContract);
  }

  async save(tokenContract: TokenContract): Promise<TokenContract> {
    try {
      //throw error when pk existed if not typeorm auto update
      const exist = await this.tokenContractRepository.findOne({
        where: { address: tokenContract.address },
      });
      if (exist) {
        console.log(
          `The token contract with address ${tokenContract.address} already exists`,
        );
        return exist;
      }
      return await this.tokenContractRepository.save(tokenContract);
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async findAll(): Promise<TokenContract[]> {
    return await this.tokenContractRepository.find();
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
