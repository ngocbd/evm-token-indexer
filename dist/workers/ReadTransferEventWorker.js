"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const TokenType_1 = require("../enums/TokenType");
const constants_1 = require("../constants");
class ReadTransferEventWorker {
    constructor(rpcUrl) {
        this._provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
    }
    get provider() {
        return this._provider;
    }
    async detectTokenType(tokenAddress) {
        try {
            const contract = this.getContract(tokenAddress, constants_1.INTERFACE_ERC155_ABI);
            const isERC721 = await contract.supportsInterface(constants_1.ERC721_INTERFACE_ID);
            const isERC1155 = await contract.supportsInterface(constants_1.ERC1155_INTERFACE_ID);
            if (isERC721) {
                return TokenType_1.default.ERC721;
            }
            else if (isERC1155) {
                return TokenType_1.default.ERC1155;
            }
            else {
                return TokenType_1.default.UNKNOWN;
            }
        }
        catch (err) {
            const isErc20 = await this.isErc20(tokenAddress);
            if (isErc20) {
                return TokenType_1.default.ERC20;
            }
            else {
                console.log('detect failed for token: ', tokenAddress);
                return TokenType_1.default.UNKNOWN;
            }
        }
    }
    async isErc20(tokenAddress) {
        try {
            const bytecode = await this._provider.getCode(tokenAddress);
            let isErc20 = true;
            for (let i = 0; i < constants_1.ERC20_HUMAN_READABLE_ABI.length; i++) {
                const abi = constants_1.ERC20_HUMAN_READABLE_ABI[i];
                if (abi.includes('constructor') || abi.includes('event')) {
                    continue;
                }
                const methodDefinition = abi.replace('function', '').trim();
                const methodSelector = constants_1.ERC20_INTERFACE.getSighash(methodDefinition);
                const methodSelectorHex = methodSelector.substring(2);
                if (!bytecode.includes(methodSelectorHex)) {
                    isErc20 = false;
                    break;
                }
            }
            return isErc20;
        }
        catch (err) {
            console.log('in check erc20 function: ', err.message);
            return false;
        }
    }
    getContract(address, abi) {
        return new ethers_1.ethers.Contract(address, abi, this._provider);
    }
    run() {
        console.log('ReadTransferEventWorker is running');
        this._provider.on('block', (block) => {
            console.log(block);
        });
    }
}
exports.default = ReadTransferEventWorker;
//# sourceMappingURL=ReadTransferEventWorker.js.map