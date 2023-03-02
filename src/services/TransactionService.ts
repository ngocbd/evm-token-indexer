import {Repository} from 'typeorm';
import {Transaction} from '../entity';
import {AppDataSource} from '../data-source';

export default class TransactionService {


  private readonly transactionRepository: Repository<Transaction>;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  async save(transaction: Transaction): Promise<Transaction> {
    return await this.transactionRepository.save(transaction, {
      transaction: false,
    });
  }

  async getMaxBlockNumber(): Promise<number> {
    const queryRes = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('MAX(transaction.block_number)', 'max_block_number')
      .getRawOne()

    return queryRes.max_block_number || 0;
  }
  async saveMany(listTransactionEntity: Transaction[]) {
    return await this.transactionRepository.save(listTransactionEntity, {
      transaction: false,
    });
  }
  async deleteAll() {
    return await this.transactionRepository.clear();
  }
}
