import { Not, Repository } from 'typeorm';
import { Erc1155TransferEvent, Erc20TransferEvent, Erc721TransferEvent, TokenContract, TransferEvent } from '../entity';
import { AppDataSource } from '../data-source';
import { DATABASE_SCHEMA, REDIS_LAST_SAVED_ERC1155_TRANSFER_EVENTS } from '../constants';
import TokenType from "../enums/TokenType";
import logger from "../logger";
import { convertFromHexToNumberString, deletePadZero } from "../utils";
import { utils } from "ethers";
import RedisService from "./RedisService";

export default class TransferEventService {
  private readonly transferEventRepository: Repository<TransferEvent>;
  private readonly erc20TransferEventRepository: Repository<Erc20TransferEvent>;
  private readonly erc721TransferEventRepository: Repository<Erc721TransferEvent>;
  private readonly erc1155TransferEventRepository: Repository<Erc1155TransferEvent>;
  private readonly redisService: RedisService;
  private readonly _tableName: string;
  private static _queryRunner: any = null;

  constructor() {
    this.transferEventRepository = AppDataSource.getRepository(TransferEvent);
    this.erc20TransferEventRepository = AppDataSource.getRepository(Erc20TransferEvent);
    this.erc721TransferEventRepository = AppDataSource.getRepository(Erc721TransferEvent);
    this.erc1155TransferEventRepository = AppDataSource.getRepository(Erc1155TransferEvent);
    this.redisService = new RedisService();
    this._tableName = 'transfer_events';
  }

  async getTransferEventBetween(start, end): Promise<TransferEvent[]> {
    let queryRunner = TransferEventService._queryRunner;
    if (!queryRunner) {
      console.log('create query runner');
      TransferEventService._queryRunner = AppDataSource.createQueryRunner();
      queryRunner = TransferEventService._queryRunner;
    }
    const result: TransferEvent[] = await queryRunner.manager.query(
      `SELECT *
       FROM ${DATABASE_SCHEMA}.${this._tableName}
       WHERE token_type != '${TokenType.ERC1155}'
                AND id >= ${start}
         AND id
           < ${end}`
    );
    return result;
  }

  async getERC20TransferEventsBetween(start, end): Promise<TransferEvent[]> {
    let queryRunner = TransferEventService._queryRunner;
    if (!queryRunner) {
      console.log('create query runner');
      TransferEventService._queryRunner = AppDataSource.createQueryRunner();
      queryRunner = TransferEventService._queryRunner;
    }
    const result: TransferEvent[] = await queryRunner.manager.query(
      `SELECT *
       FROM ${DATABASE_SCHEMA}.${this._tableName}
       WHERE id >= ${start}
         AND id < ${end}
         AND token_type = '${TokenType.ERC20}'`
    );
    return result;
  }

  async save(transferEvent: TransferEvent, isERC1155BatchTransfer = false): Promise<TransferEvent> {

    if (!isERC1155BatchTransfer) {
      const existedTransferEvent = await this.transferEventRepository.findOne({
        where: {
          tx_hash: transferEvent.tx_hash,
          log_index: transferEvent.log_index,
        }
      });
      if (existedTransferEvent) {
        logger.error(`Transfer event with tx_hash ${transferEvent.tx_hash} and log_index ${transferEvent.log_index} already existed`);
        return null;
      }
    }
    return await this.transferEventRepository.save(transferEvent);
  }

  async saveERC20TransferEvent(transferEvent: any) {
    try {
      const erc20TransferEvent = new Erc20TransferEvent();
      erc20TransferEvent.log_index = transferEvent.logIndex;
      erc20TransferEvent.tx_hash = transferEvent.transactionHash;
      erc20TransferEvent.block_number = Number(transferEvent.blockNumber);
      erc20TransferEvent.address = transferEvent.address;
      erc20TransferEvent.from = deletePadZero(transferEvent.topics[1]);
      erc20TransferEvent.to = deletePadZero(transferEvent.topics[2]);
      erc20TransferEvent.amount = convertFromHexToNumberString(transferEvent.data)
      return await this.erc20TransferEventRepository.save(erc20TransferEvent, {
        transaction: false
      });
    } catch (err) {
      logger.error(`Error when save ERC20 transfer event ${err.message}`);
      return null;
    }
  }

  async saveERC721TransferEvent(transferEvent: any) {
    try {
      // check existed
      const existedTransferEvent = await this.erc721TransferEventRepository.findOne({
        where: {
          tx_hash: transferEvent.transactionHash,
          log_index: transferEvent.logIndex,
        }
      });
      if (existedTransferEvent) {
        throw new Error(`Transfer event with tx_hash ${transferEvent.transactionHash} and log_index ${transferEvent.logIndex} already existed`);
      }
      const transferEventEntity = new Erc721TransferEvent();
      transferEventEntity.log_index = transferEvent.logIndex;
      transferEventEntity.tx_hash = transferEvent.transactionHash;
      transferEventEntity.block_number = Number(transferEvent.blockNumber);
      transferEventEntity.address = transferEvent.address;
      transferEventEntity.from = deletePadZero(transferEvent.topics[1]);
      transferEventEntity.to = deletePadZero(transferEvent.topics[2]);
      console.log("erc721 transfer event topic three", transferEvent.topics[3]);

      const tokenId = convertFromHexToNumberString(transferEvent.topics[3]);
      transferEventEntity.tokenId = tokenId;
      return await this.erc721TransferEventRepository.save(transferEventEntity);
    } catch (err) {
      logger.error(`Error when save ERC721 transfer event ${err.message}`);
      return null;
    }
  }

  async saveERC1155TransferEvent(transferEvent: any) {
    try {
      const lastSavedTransfer = await this.redisService.getValue(REDIS_LAST_SAVED_ERC1155_TRANSFER_EVENTS) || '';
      const [txHash, logIndex] = lastSavedTransfer.split('-');
      if (txHash === transferEvent.transactionHash && logIndex === transferEvent.logIndex.toString()) {
        throw new Error(`Transfer event with tx_hash ${transferEvent.transactionHash} and log_index ${transferEvent.logIndex} already saved`);
      }
      const entity = new Erc1155TransferEvent();
      entity.log_index = transferEvent.logIndex;
      entity.tx_hash = transferEvent.transactionHash;
      entity.block_number = Number(transferEvent.blockNumber);
      entity.address = transferEvent.address;
      entity.from = deletePadZero(transferEvent.topics[2]);
      entity.to = deletePadZero(transferEvent.topics[3]);

      const erc1155TransferBatchTopic = utils.id(
        'TransferBatch(address,address,address,uint256[],uint256[])',
      );
      const isTransferBatch =
        transferEvent.topics[0] === erc1155TransferBatchTopic;
      if (isTransferBatch) {
        const [ids, amounts] = utils.defaultAbiCoder.decode(
          ['uint256[]', 'uint256[]'],
          transferEvent.data,
        );
        const idsNumber = ids.map((id) => id.toString());
        const amountsNumber = amounts.map((amount) => amount.toString());
        let res = [];
        for (let i = 0; i < idsNumber.length; i++) {
          const id = idsNumber[i];
          const amount = amountsNumber[i];
          const toSaveCopy = { ...entity };
          toSaveCopy.tokenId = id;
          toSaveCopy.amount = amount;
          const saved = await this.erc1155TransferEventRepository.save(toSaveCopy);
          res.push(saved)
        }
        // update last saved transfer event
        await this.redisService.setValue(REDIS_LAST_SAVED_ERC1155_TRANSFER_EVENTS, `${transferEvent.transactionHash}-${transferEvent.logIndex}`);
        return res;
      } else {
        const [tokenId, amount] = utils.defaultAbiCoder.decode(
          ['uint256', 'uint256'],
          transferEvent.data,
        );
        entity.tokenId = tokenId.toString();
        entity.amount = amount.toString();
        await this.redisService.setValue(REDIS_LAST_SAVED_ERC1155_TRANSFER_EVENTS, `${transferEvent.transactionHash}-${transferEvent.logIndex}`);
        return await this.erc1155TransferEventRepository.save(entity);
      }
    } catch (err) {
      logger.error(`Error when save ERC1155 transfer event ${err.message}`);
      return null;
    }
  }

  async saveBaseOnToken(transferEvent: any, token: any) {

    switch (token.type) {
      case TokenType.ERC20:
        return await this.saveERC20TransferEvent(transferEvent);
        break
      case TokenType.ERC721:
        return await this.saveERC721TransferEvent(transferEvent);
        break;
      case TokenType.ERC1155:
        return await this.saveERC1155TransferEvent(transferEvent);
        break;
      default:
        return null;
    }
  }

  async saveBatch(transferEvents: any[], token: any): Promise<any[]> {
    switch (token.type) {
      case TokenType.ERC20:
        return await this.saveBatchErc20TransferEvent(transferEvents);
        break
      case TokenType.ERC721:
        return await this.saveBatchErc721TransferEvent(transferEvents);
        break;
      case TokenType.ERC1155:
        const listRes = []
        for (const transferEvent of transferEvents) {
          const res = await this.saveERC1155TransferEvent(transferEvent);
          if (!res) {
            continue;
          }
          if (Array.isArray(res)) {
            listRes.push(...res);
          } else {
            listRes.push(res);
          }
        }
        return listRes;
        break;
      default:
        return null;
    }
  }

  async saveBatchErc20TransferEvent(transferEvents: any[]): Promise<any[]> {
    try {
      const erc20TransferEventEntities: Erc20TransferEvent[] = [];
      for (const transferEvent of transferEvents) {
        const erc20TransferEvent = new Erc20TransferEvent();
        erc20TransferEvent.log_index = transferEvent.logIndex;
        erc20TransferEvent.tx_hash = transferEvent.transactionHash;
        erc20TransferEvent.block_number = Number(transferEvent.blockNumber);
        erc20TransferEvent.address = transferEvent.address;
        erc20TransferEvent.from = deletePadZero(transferEvent.topics[1]);
        erc20TransferEvent.to = deletePadZero(transferEvent.topics[2]);
        erc20TransferEvent.amount = convertFromHexToNumberString(transferEvent.data)
        erc20TransferEventEntities.push(erc20TransferEvent);
      }
      return await this.erc20TransferEventRepository.save(erc20TransferEventEntities);
    } catch (err) {
      logger.error(`Error when save ERC20 transfer event ${err.message}`);
      return [];
    }
  }

  async saveBatchErc721TransferEvent(transferEvents: any[]): Promise<any[]> {
    try {
      const erc721TransferEventEntities: Erc721TransferEvent[] = [];

      for (const transferEvent of transferEvents) {
        // check existed
        const existedTransferEvent = await this.erc721TransferEventRepository.findOne({
          where: {
            tx_hash: transferEvent.transactionHash,
            log_index: transferEvent.logIndex,
          }
        });
        if (existedTransferEvent) {
          console.log(`Transfer event with tx_hash ${transferEvent.transactionHash} and log_index ${transferEvent.logIndex} already saved`);
          continue;
        }

        const transferEventEntity = new Erc721TransferEvent();
        transferEventEntity.log_index = transferEvent.logIndex;
        transferEventEntity.tx_hash = transferEvent.transactionHash;
        transferEventEntity.block_number = Number(transferEvent.blockNumber);
        transferEventEntity.address = transferEvent.address;
        transferEventEntity.from = deletePadZero(transferEvent.topics[1]);
        transferEventEntity.to = deletePadZero(transferEvent.topics[2]);
        const tokenId = convertFromHexToNumberString(transferEvent.topics[3]);
        transferEventEntity.tokenId = tokenId;
        erc721TransferEventEntities.push(transferEventEntity);
      }
      return await this.erc721TransferEventRepository.save(erc721TransferEventEntities);
    } catch (err) {
      logger.error(`Error when save ERC721 transfer event ${err.message}`);
      return [];
    }
  }

  async getHighestBlock() {
    try {
      const queryRunner = await AppDataSource.createQueryRunner();
      const result = await queryRunner.manager.query(
        `SELECT MAX(block_number)
         FROM ${DATABASE_SCHEMA}.${this._tableName}`,
      );
      return result[0].max || 0;
    } catch (err: any) {
      logger.error('Error when get latest block');
      return 0;
    }
  }

  async getHighestId() {
    try {
      const queryRunner = await AppDataSource.createQueryRunner();
      const result = await queryRunner.manager.query(
        `SELECT MAX(id)
         FROM ${DATABASE_SCHEMA}.${this._tableName}`,
      );
      return result[0].max || 0;
    } catch (err: any) {
      logger.error('Error when get latest id');
      return 0;
    }
  }

  async getTransferEventPagination(limit, offset): Promise<TransferEvent[]> {
    return await this.transferEventRepository.find({
      take: limit,
      skip: offset,
      where: {
        tokenType: Not(TokenType.ERC1155),
      },
      order: {
        id: 'ASC'
      }
    })
  }

  async remove(transferEvents: TransferEvent[]) {
    return await this.transferEventRepository.remove(transferEvents)
  }

  async deleteAll() {
    return await this.transferEventRepository.clear();
  }
}
