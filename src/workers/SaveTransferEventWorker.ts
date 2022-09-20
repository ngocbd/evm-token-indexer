import {RabbitMqService, TokenContractService, TransferEventService} from "../services";
import {ethers, utils} from "ethers";
import {TokenContract, TransferEvent} from "../entity";
import TokenType from "../enums/TokenType";
import {convertFromHexToNumberString, deletePadZero} from "../utils";
import logger from "../logger";
import {SAVE_DATA_QUEUE_NAME, SAVE_TRANSFER_EVENT_QUEUE_NAME} from "../constants";

class SaveTransferEventWorker {
  _rabbitMqService: RabbitMqService;
  _tokenContractService: TokenContractService;
  _transferEventService: TransferEventService;
  _provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._rabbitMqService = new RabbitMqService();
    this._transferEventService = new TransferEventService();
  }

  async saveTransferEvent(
    transferEvent: ethers.providers.Log,
    token: TokenContract,
  ): Promise<TransferEvent | null> {
    try {
      const toSaveTransferEvent = new TransferEvent();
      toSaveTransferEvent.log_index = transferEvent.logIndex;
      toSaveTransferEvent.tx_hash = transferEvent.transactionHash;
      toSaveTransferEvent.block_number = BigInt(transferEvent.blockNumber);
      toSaveTransferEvent.address = transferEvent.address;

      switch (token.type) {
        case TokenType.ERC20:
          toSaveTransferEvent.tokenType = TokenType.ERC20;
          toSaveTransferEvent.from = deletePadZero(transferEvent.topics[1]);
          toSaveTransferEvent.to = deletePadZero(transferEvent.topics[2]);
          toSaveTransferEvent.amount = convertFromHexToNumberString(transferEvent.data)
          toSaveTransferEvent.token_id = null;
          return await this._transferEventService.save(toSaveTransferEvent);
        case TokenType.ERC721:
          toSaveTransferEvent.tokenType = TokenType.ERC721;
          toSaveTransferEvent.from = deletePadZero(transferEvent.topics[1]);
          toSaveTransferEvent.to = deletePadZero(transferEvent.topics[2]);
          toSaveTransferEvent.amount = '1';
          const tokenId = convertFromHexToNumberString(transferEvent.topics[3]);
          toSaveTransferEvent.token_id = tokenId;
          return await this._transferEventService.save(toSaveTransferEvent);
        case TokenType.ERC1155:
          toSaveTransferEvent.tokenType = TokenType.ERC1155;
          toSaveTransferEvent.from = deletePadZero(transferEvent.topics[2]);
          toSaveTransferEvent.to = deletePadZero(transferEvent.topics[3]);

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
            let res = null;
            for (let i = 0; i < idsNumber.length; i++) {
              const id = idsNumber[i];
              const amount = amountsNumber[i];
              const toSaveCopy = {...toSaveTransferEvent};
              toSaveCopy.token_id = id;
              toSaveCopy.amount = amount;
              res = await this._transferEventService.save(toSaveCopy);
            }
            return res;
          } else {
            const [tokenId, amount] = utils.defaultAbiCoder.decode(
              ['uint256', 'uint256'],
              transferEvent.data,
            );
            toSaveTransferEvent.token_id = tokenId.toString();
            toSaveTransferEvent.amount = amount.toString();
            return await this._transferEventService.save(toSaveTransferEvent);
          }
        case TokenType.UNKNOWN:
          toSaveTransferEvent.tokenType = TokenType.UNKNOWN;
          return null;
      }

      // const res = await this._transferEventService.save(toSaveTransferEvent);
      // return res
    } catch (err: any) {
      logger.error(
        `Save transfer event failed for ${transferEvent.transactionHash} msg: ${err.message}`,
      );
      return null;
    }
  }

  async saveData(msg: string) {
    const data: { transferEvent: ethers.providers.Log, token: TokenContract } = JSON.parse(msg);
    const start = Date.now();
    //IMPORTANT: just save transaction hash
    const res = await this.saveTransferEvent(data.transferEvent, data.token);
    const end = Date.now();
    console.log(`Saved transfer event at ${data.transferEvent.transactionHash} took ${end - start} ms`);
    if (res) {
      logger.info(
        `Saved transfer event ${res.tx_hash} log_index: ${res.log_index}`,
      );
    }

  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      SAVE_TRANSFER_EVENT_QUEUE_NAME,
      undefined,
      this.saveData.bind(this),
    );
  }
}

export default SaveTransferEventWorker