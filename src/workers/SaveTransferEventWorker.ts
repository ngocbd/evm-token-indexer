import { ethers } from "ethers";
import { CounterService, RabbitMqService, TokenContractService, TransferEventService } from "../services";
import { TokenContract, TransferEvent } from "../entity";
import { SAVE_TOKEN_BALANCE_QUEUE_NAME, SAVE_TRANSFER_EVENT_ERROR_QUEUE_NAME, SAVE_TRANSFER_EVENT_QUEUE_NAME } from "../constants";
import logger from "../logger";
import CounterName from "../enums/CounterName";
import { measurePromise } from '../utils/index';
import TokenType from "../enums/TokenType";
import IndexerConfigService from '../services/IndexerConfigService';

export default class SaveTransferEventWorker {
  _rabbitMqService: RabbitMqService;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _provider: ethers.providers.JsonRpcProvider;
  _counterService: CounterService;
  _indexerConfigService: IndexerConfigService
  _tuple = [];

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._rabbitMqService = new RabbitMqService();
    this._transferEventService = new TransferEventService();
    this._counterService = new CounterService();
    
  }

  async saveBatch(data: { transferEvent: ethers.providers.Log, token: TokenContract }) {
    const tupleSize = 50;
    this._tuple.push(data);
    if (this._tuple.length !== tupleSize) return


    try {
      //handle batch save
      // separate transfer by token type
      const tokenTypeMap = new Map<TokenType, ethers.providers.Log[]>();
      for (let i = 0; i < this._tuple.length; i++) {
        const tupleData = this._tuple[i];
        if (!tokenTypeMap.has(tupleData.token.type)) {
          tokenTypeMap.set(tupleData.token.type, []);
        }
        tokenTypeMap.get(tupleData.token.type).push(tupleData.transferEvent);
      }
      //loop through each token type

      for (let [tokenType, transferEvents] of tokenTypeMap) {      
        switch (tokenType) {
          case TokenType.ERC20:
            const res = await this._transferEventService.saveBatchErc20TransferEvent(transferEvents);
            await Promise.all(res.map(async (transferEvent) => {
              await this._rabbitMqService.pushMessage(
                SAVE_TOKEN_BALANCE_QUEUE_NAME,
                JSON.stringify({
                  token: data.token,
                  transferEvent,
                }),
              );
            }))
            logger.info(
              `Saved Pushed ${res.length} erc20 transfer events to save token balance queue`,
            );
            await this._counterService.setCounter(CounterName.BLOCK_NUMBER, data.transferEvent.blockNumber)
            break;
          case TokenType.ERC721:
            const savedErc721TransferEvents = await this._transferEventService.saveBatchErc721TransferEvent(transferEvents);
            await Promise.all(savedErc721TransferEvents.map(async (transferEvent) => {
              await this._rabbitMqService.pushMessage(
                SAVE_TOKEN_BALANCE_QUEUE_NAME,
                JSON.stringify({
                  token: data.token,
                  transferEvent,
                }),
              );
            }))
            logger.info(`Saved Pushed ${savedErc721TransferEvents.length} erc721 transfer events to save token balance queue`);
            await this._counterService.setCounter(CounterName.BLOCK_NUMBER, data.transferEvent.blockNumber)
            break;
          case TokenType.ERC1155:
            const savedErc1155TransferEvents = await this._transferEventService.saveBatchErc1155TransferEvent(transferEvents);
            await Promise.all(savedErc1155TransferEvents.map(async (transferEvent) => {
              await this._rabbitMqService.pushMessage(
                SAVE_TOKEN_BALANCE_QUEUE_NAME,
                JSON.stringify({
                  token: data.token,
                  transferEvent,
                }),
              );
            }))
            logger.info(`Saved Pushed ${savedErc1155TransferEvents.length} erc1155 transfer events to save token balance queue`);
            await this._counterService.setCounter(CounterName.BLOCK_NUMBER, data.transferEvent.blockNumber)
            break;
        }
      }
    } catch (err) {
      logger.error(err);
      await this._rabbitMqService.pushMessage(SAVE_TRANSFER_EVENT_ERROR_QUEUE_NAME, JSON.stringify(this._tuple));
    } finally {
      this._tuple = [];
    }
  }

  async saveData(msg: string) {
    try {
      const data: { transferEvent: ethers.providers.Log, token: TokenContract } = JSON.parse(msg);
      await this.saveBatch(data);
    } catch (err) {
      logger.error(`Save transfer events failed msg: ${err.message}`);
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      SAVE_TRANSFER_EVENT_QUEUE_NAME,
      200,
      this.saveData.bind(this),
    );
  }
}





