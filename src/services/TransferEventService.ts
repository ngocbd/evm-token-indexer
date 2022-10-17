import {Repository} from 'typeorm';
import {TransferEvent} from '../entity';
import {AppDataSource} from '../data-source';
import {DATABASE_SCHEMA} from '../constants';
import TokenType from "../enums/TokenType";
import logger from "../logger";

export default class TransferEventService {
  private readonly transferEventRepository: Repository<TransferEvent>;
  private readonly _tableName: string;

  constructor() {
    this.transferEventRepository = AppDataSource.getRepository(TransferEvent);
    this._tableName = 'transfer_events';
  }

  async save(transferEvent: TransferEvent, isERC1155BatchTransfer = false): Promise<TransferEvent> {

    if(!isERC1155BatchTransfer) {
      const existedTransferEvent = await this.transferEventRepository.findOne({
        where: {
          tx_hash: transferEvent.tx_hash,
          log_index: transferEvent.log_index,
        }
      });
      if(existedTransferEvent) {
        logger.error(`Transfer event with tx_hash ${transferEvent.tx_hash} and log_index ${transferEvent.log_index} already existed`);
        return null;
      }
    }
    return await this.transferEventRepository.save(transferEvent);
  }

  async getHighestBlock() {
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

  async deleteAll() {
    return await this.transferEventRepository.clear();
  }
}
