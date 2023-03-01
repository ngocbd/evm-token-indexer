import { Repository } from "typeorm";
import { Counter } from "../entity";
import { AppDataSource } from "../data-source";
import CounterName from "../enums/CounterName";
import { DATABASE_SCHEMA } from "../constants";
import { TransactionService } from ".";

class CounterService {
  private readonly CounterRepository: Repository<Counter>;
  private readonly transactionService: TransactionService

  constructor() {
    this.CounterRepository = AppDataSource.getRepository(Counter);
    this.transactionService = new TransactionService();
  }

  async updateCounter(counter: Counter): Promise<Counter> {
    return await this.CounterRepository.save(counter);
  }

  async initOrResetCounter() {
    let queryRunner = AppDataSource.createQueryRunner();
    try {

      for (const key of Object.keys(CounterName)) {
        if (key === 'BLOCK_NUMBER') {
          continue;
        }
        const counter = new Counter();
        counter.relationName = CounterName[key];
        // select count from db
        const res = await queryRunner.manager.query(`SELECT COUNT(*)
                                                     FROM ${DATABASE_SCHEMA}.${counter.relationName}`)

        counter.counter = +res[0].count;
        const saved = await this.CounterRepository.save(counter);
        console.log(`Init counter for ${counter.relationName} with value ${saved.counter}`);
      }
      // save current sync block number
      const currentSyncBlock = await this.transactionService.getMaxBlockNumber();
      const counter = new Counter();
      counter.relationName = CounterName.BLOCK_NUMBER
      counter.counter = currentSyncBlock;
      const saved = await this.CounterRepository.save(counter);
      console.log(`Init counter for ${counter.relationName} with value ${saved.counter}`);
    } catch (e) {
      console.log(e)
    } finally {
      await queryRunner.release();
    }
  }

  async getCounter(counterName: CounterName): Promise<number> {
    const counterEntity = await this.CounterRepository.findOne({
      where: {
        relationName: counterName
      }
    });
    if (!counterEntity) {
      return 0;
    }
    return counterEntity.counter;
  }

  async setCounter(counterName: CounterName, value: number) {
    try {
      const counterEntity = await this.CounterRepository.findOne({
        where: {
          relationName: counterName
        }
      });
      if (!counterEntity) {
        throw new Error(`Counter ${counterName} not found`);
      }
      counterEntity.counter = value;
      return await this.CounterRepository.save(counterEntity, {
        transaction: false
      });
    } catch (e) {
      console.log(e)
      return null;
    }
  }

}

export default CounterService;
