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
        throw new Error(
          `The token with address ${tokenContract.address} already exists`,
        );
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
}
