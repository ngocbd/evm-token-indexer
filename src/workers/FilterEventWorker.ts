import { ethers } from 'ethers';
import TokenType from '../enums/TokenType';
import {
  CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  ERC1155_INTERFACE_ID,
  ERC20_ABI,
  ERC20_HUMAN_READABLE_ABI,
  ERC20_INTERFACE,
  ERC721_INTERFACE,
  ERC721_INTERFACE_ID,
  EVENT_TRANSFER_QUEUE_NAME,
  INTERFACE_ERC155_ABI,
  SAVE_DATA_QUEUE_NAME,
} from '../constants';

import { RabbitMqService, TokenContractService } from '../services';
import { getContract, sleep } from '../utils';
import { TokenContract } from '../entity';
import logger from '../logger';

export default class FilterEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _rabbitMqService: RabbitMqService;
  _tokenContractService: TokenContractService;
  _awsProvider: ethers.providers.JsonRpcProvider;
  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._rabbitMqService = new RabbitMqService();
    this._tokenContractService = new TokenContractService();
    this._awsProvider = new ethers.providers.JsonRpcProvider(CLOUD_FLARE_GATEWAY_ETH_RPC_URL)
  }

  get provider(): ethers.providers.JsonRpcProvider {
    return this._provider;
  }

  /*accept token address return token type*/
  async detectTokenType(
    tokenAddress: string,
    maxRetries = 3,
    retryTime = 1000,
  ): Promise<TokenType> {
    try {
      const isErc20 = await this.isErc20(tokenAddress);
      if (isErc20) {
        return TokenType.ERC20;
      }
      //detect erc 721 or 1155
      const contract = getContract(
        tokenAddress,
        INTERFACE_ERC155_ABI,
        this._provider,
      );
      //check if smart contract has supportsInterface function
      const methodDefinition = ERC721_INTERFACE.getFunction('supportsInterface');
      const methodSelector = ERC721_INTERFACE.getSighash(methodDefinition);
      const methodSelectorHex = methodSelector.substring(2);
      const bytecode = await this._provider.getCode(tokenAddress);

      if (!bytecode.includes(methodSelectorHex)) {
        return TokenType.UNKNOWN;
      }

      const isERC721 = await contract.supportsInterface(ERC721_INTERFACE_ID);
      const isERC1155 = await contract.supportsInterface(ERC1155_INTERFACE_ID);
      
      if (isERC721) {
        return TokenType.ERC721;
      } else if (isERC1155) {
        return TokenType.ERC1155;
      } else {
        return TokenType.UNKNOWN;
      }
    } catch (err) {
      //retry
      if (maxRetries > 0) {
        logger.warn(
          `detect token type failed for token: ${tokenAddress}: ${err} ${maxRetries} retries left...`,
        );
        await sleep(retryTime);
        return this.detectTokenType(tokenAddress, maxRetries - 1);
      }
      logger.error(
        `detect token type failed for token: ${tokenAddress} : ${err}`,
      );
      return TokenType.UNKNOWN;
    }
  }

  async getTokenMetaData(
    tokenAddress: string,
    tokenType: TokenType,
  ): Promise<any> {
    try {

      const erc20Contract = getContract(
        tokenAddress,
        ERC20_ABI,
        this._awsProvider,
      );
      const name = await erc20Contract.name();
      const symbol = await erc20Contract.symbol();
      let decimals = null;
      if (tokenType === TokenType.ERC20) {
        const decimalsNumber: number = await erc20Contract.decimals();
        decimals = decimalsNumber.toString();
      }
      return {
        name,
        symbol,
        decimals,
      };
    } catch (err: any) {
      logger.error(
        'get erc20 metadata failed for token: ',
        tokenAddress,
        ' error: ',
        err.message,
      );
      console.log(err);

      return {
        name: null,
        symbol: null,
        decimals: null,
      };
    }
  }

  async isErc20(tokenAddress: string): Promise<boolean> {
    const bytecode = await this._provider.getCode(tokenAddress);
    let isErc20 = true;

    for (let i = 0; i < ERC20_HUMAN_READABLE_ABI.length; i++) {
      const abi = ERC20_HUMAN_READABLE_ABI[i];
      //skip constructor and event
      if (abi.includes('constructor') || abi.includes('event')) {
        continue;
      }
      const methodDefinition = abi.replace('function', '').trim();
      const methodSelector = ERC20_INTERFACE.getSighash(methodDefinition);
      const methodSelectorHex = methodSelector.substring(2);
      if (!bytecode.includes(methodSelectorHex)) {
        isErc20 = false;
        break;
      }
    }
    return isErc20;
  }

  //get first contract address of this message
  //detect token type
  //if token type is ERC1155, ERC 20, ERC721 then get all events of this contract and push to queue
  //if not then do nothing
  //if an error occurs, retry 3 times if failed saved error log
  async filterEventTransfer(message: string) {
    const listTransferEvents = JSON.parse(message);
    const firstTransferEvent = listTransferEvents[0];
    const tokenAddress = firstTransferEvent.address;
    //try to check token in database first if exist push to queue else detect then push to queue
    let tokenContract = await this._tokenContractService.findByAddress(
      tokenAddress,
    );
    if (tokenContract && tokenContract.validated < 0) {
      console.log(
        'Detected existed invalid token '
          .concat(tokenAddress)
          .concat(' skip...'),
      );
      return;
    }
    if (tokenContract) {
      //push to queue
      const messageToQueue = JSON.stringify({
        tokenContract,
        transferEvents: listTransferEvents,
        isNewToken: false,
      });
      await this._rabbitMqService.pushMessage(
        SAVE_DATA_QUEUE_NAME,
        messageToQueue,
      );
      logger.info(
        `push message to queue for exist valid token: ${tokenContract.name} - ${tokenAddress}`,
      );
      return;
    }
    //detect token type
    tokenContract = new TokenContract();
    const tokenType = await this.detectTokenType(tokenAddress);
    tokenContract.type = tokenType;
    tokenContract.address = tokenAddress;
    if (tokenType === TokenType.UNKNOWN) {
      //push token with validated status = -1; and empty transferEvents
      tokenContract.validated = -1;
      tokenContract.block_number = firstTransferEvent.blockNumber;
      const messageToQueue = JSON.stringify({
        tokenContract,
        transferEvents: [],
        isNewToken: true,
      });
      await this._rabbitMqService.pushMessage(
        SAVE_DATA_QUEUE_NAME,
        messageToQueue,
      );
      logger.info(
        `push message to queue for invalid token: ${tokenAddress} and skip all transfers events...`,
      );
      return;
    }
    //get the token meta data for erc20 token
    const metaData = await this.getTokenMetaData(tokenAddress, tokenType);
    tokenContract.name = metaData.name;
    tokenContract.symbol = metaData.symbol;
    tokenContract.decimal = metaData.decimals;
    tokenContract.validated = 1;
    //save block number that this token is detected
    tokenContract.block_number = firstTransferEvent.blockNumber;
    logger.info(
      `detected token: ${tokenContract.name} - ${tokenAddress} at block number: ${tokenContract.block_number}`,
    );
    //push to queue
    const messageToQueue = JSON.stringify({
      tokenContract,
      transferEvents: listTransferEvents,
      isNewToken: true,
    });
    await this._rabbitMqService.pushMessage(
      SAVE_DATA_QUEUE_NAME,
      messageToQueue,
    );
    logger.info(
      `push message to queue for new token: ${tokenContract.name} - ${tokenAddress}`,
    );
    return;
  }

  async run() {
    await this._rabbitMqService.consumeMessage(
      EVENT_TRANSFER_QUEUE_NAME,
      2000,
      this.filterEventTransfer.bind(this),
    );
  }
}
