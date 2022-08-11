import { ethers } from 'ethers';
import TokenType from '../enums/TokenType';
import {
  ERC1155_INTERFACE_ID,
  ERC20_HUMAN_READABLE_ABI,
  ERC20_INTERFACE,
  ERC721_INTERFACE_ID,
  INTERFACE_ERC155_ABI,
} from '../constants';

export default class ReadTransferEventWorker {
  _provider: ethers.providers.JsonRpcProvider;

  constructor(rpcUrl: string) {
    this._provider = new ethers.providers.JsonRpcProvider(rpcUrl);
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

  run(): void {
    console.log('ReadTransferEventWorker is running');
    this._provider.on('block', (block) => {
      console.log(block);
      // filter.toBlock = block.number;
      // provider.getLogs(filter).then(res => {
      //   console.log(res.length)
      // })
    });
  }
}
