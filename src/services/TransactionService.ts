import {Repository} from "typeorm";
import {Transaction} from "../entity";
import {AppDataSource} from "../data-source";

export default class TransactionService {
  private readonly transactionRepository: Repository<Transaction>;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  async save(transaction: Transaction): Promise<Transaction> {
    const exist = await this.transactionRepository.findOne({
      where: {
        tx_hash: transaction.tx_hash,
      }
    })
    if (exist) {
      throw new Error(
        `The transaction with hash ${transaction.tx_hash} already exists`,
      );
    }
    return await this.transactionRepository.save(transaction);
  }

  async deleteAll() {
    return await this.transactionRepository.clear();
  }
}