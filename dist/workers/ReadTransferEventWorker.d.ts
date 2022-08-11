import { ethers } from 'ethers';
import TokenType from '../enums/TokenType';
export default class ReadTransferEventWorker {
    _provider: ethers.providers.JsonRpcProvider;
    constructor(rpcUrl: string);
    get provider(): ethers.providers.JsonRpcProvider;
    detectTokenType(tokenAddress: string): Promise<TokenType>;
    isErc20(tokenAddress: string): Promise<boolean>;
    getContract(address: string, abi: any): ethers.Contract;
    run(): void;
}
