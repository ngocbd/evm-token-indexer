import { ethers } from 'ethers';
import TokenType from '../enums/TokenType';
import {
  ERC1155_INTERFACE_ID,
  ERC20_HUMAN_READABLE_ABI,
  ERC20_INTERFACE,
  ERC721_INTERFACE_ID,
  EVENT_TRANSFER_QUEUE_NAME,
  INTERFACE_ERC155_ABI,
  SAVE_DATA_QUEUE_NAME,
} from '../constants';
import { Publisher, Receiver } from './index';
import { TokenContractService } from '../services';

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
  async detectTokenType(tokenAddress: string): Promise<TokenType> {
    try {
      const contract = this.getContract(tokenAddress, INTERFACE_ERC155_ABI);
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
      //try to detect ERC20 token
      const isErc20 = await this.isErc20(tokenAddress);
      if (isErc20) {
        return TokenType.ERC20;
      } else {
        console.log('detect failed for token: ', tokenAddress);
        return TokenType.UNKNOWN;
      }
    }
  }

  async isErc20(tokenAddress: string): Promise<boolean> {
    try {
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
    } catch (err) {
      console.log('in check erc20 function: ', err.message);
      return false;
    }
  }

  getContract(address: string, abi: any) {
    return new ethers.Contract(address, abi, this._provider);
  }
  //get first contract address of this message
  //detect token type
  //if token type is ERC1155, ERC 20, ERC721 then get all events of this contract and push to queue
  //if not then do nothing
  async filterEventTransfer(message: string) {
    const listTransferEvents = JSON.parse(message);
    const tokenAddress = listTransferEvents[0].address;
    //try to check token type in db first before using the detectTokenType function
    const tokenContract = await this._tokenContractService.findByAddress(
      tokenAddress,
    );
    let tokenType: TokenType;
    let isNewToken = false;
    if (tokenContract) {
      tokenType = tokenContract.type;
    } else {
      tokenType = await this.detectTokenType(tokenAddress);
      isNewToken = true;
    }
    if (tokenType === TokenType.UNKNOWN) {
      console.log('unknown token type for token: ', tokenAddress, ' skip...');
      return;
    }
    //push to queue
    const messageToQueue = JSON.stringify({
      tokenType: tokenType,
      transferEvents: listTransferEvents,
      isNewToken: isNewToken,
    });
    await this._publisher.pushMessage(messageToQueue);
  }

  async run() {
    await this._receiver.consumeMessage(this.filterEventTransfer.bind(this));
  }
}
