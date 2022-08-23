import { ethers } from 'ethers';
import TokenType from '../enums/TokenType';
import {
  ERC1155_INTERFACE_ID,
  ERC20_ABI,
  ERC20_HUMAN_READABLE_ABI,
  ERC20_INTERFACE,
  ERC721_INTERFACE_ID,
  EVENT_TRANSFER_QUEUE_NAME,
  INTERFACE_ERC155_ABI,
  SAVE_DATA_QUEUE_NAME,
} from '../constants';
import { Publisher, Receiver } from './index';
import { TokenContractService } from '../services';
import { getContract, sleep } from '../utils';
import { TokenContract } from '../entity';
import logger from '../logger';

export default class FilterEventWorker {
  _provider: ethers.providers.JsonRpcProvider;
  _publisher: Publisher;
  _receiver: Receiver;
  _tokenContractService: TokenContractService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._publisher = new Publisher(SAVE_DATA_QUEUE_NAME);
    this._receiver = new Receiver(EVENT_TRANSFER_QUEUE_NAME);
    this._tokenContractService = new TokenContractService();
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
          `detect token type failed for token: ${tokenAddress}: ${err} retrying...`,
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
        this._provider,
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
    if (tokenContract) {
      //push to queue
      const messageToQueue = JSON.stringify({
        tokenContract,
        transferEvents: listTransferEvents,
        isNewToken: false,
      });
      await this._publisher.pushMessage(messageToQueue);
      logger.info(
        `push message to queue for exist token: ${tokenContract.name} - ${tokenAddress}`,
      );
      return;
    }
    //detect token type
    tokenContract = new TokenContract();
    const tokenType = await this.detectTokenType(tokenAddress);
    tokenContract.type = tokenType;
    tokenContract.address = tokenAddress;
    if (tokenType === TokenType.UNKNOWN) {
      logger.info('unknown token type for token: ', tokenAddress, ' skip...');
      return;
    }
    //get the token meta data for erc20 token
    const metaData = await this.getTokenMetaData(tokenAddress, tokenType);
    tokenContract.name = metaData.name;
    tokenContract.symbol = metaData.symbol;
    tokenContract.decimal = metaData.decimals;

    //save block number that this token is detected
    tokenContract.block_number = firstTransferEvent.blockNumber;
    //push to queue
    const messageToQueue = JSON.stringify({
      tokenContract,
      transferEvents: listTransferEvents,
      isNewToken: true,
    });
    await this._publisher.pushMessage(messageToQueue);
    logger.info(
      `push message to queue for new token: ${tokenContract.name} - ${tokenAddress}`,
    );
    return;
  }

  async run() {
    await this._receiver.consumeMessage(this.filterEventTransfer.bind(this));
  }
}
