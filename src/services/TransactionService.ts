import { Repository } from 'typeorm';
import { Transaction } from '../entity';
import { AppDataSource } from '../data-source';

export default class TransactionService {
  private readonly transactionRepository: Repository<Transaction>;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  async save(transaction: Transaction): Promise<Transaction> {
    return await this.transactionRepository.save(transaction);
  }


  async deleteAll() {
    return await this.transactionRepository.clear();
  }
}
