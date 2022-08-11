"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ReadTransferEventWorker_1 = require("./workers/ReadTransferEventWorker");
const constants_1 = require("./constants");
const ethers_1 = require("ethers");
const TokenType_1 = require("./enums/TokenType");
const main = async () => {
    const startTime = new Date().getTime();
    const worker = new ReadTransferEventWorker_1.default(constants_1.ETH_MAIN_NET_RPC_URL);
    const filter = {
        topics: [ethers_1.utils.id('Transfer(address,address,uint256)')],
        fromBlock: 15311816,
        toBlock: 15311826,
    };
    const logs = await worker.provider.getLogs(filter);
    console.log('transfer events count: ', logs.length);
    console.log('blocks length: ', filter.toBlock - filter.fromBlock);
    const resp = await Promise.all(logs.map(async (log) => {
        const tokenAddress = log.address;
        return new Promise(async (resolve, reject) => {
            const tokenType = await worker.detectTokenType(tokenAddress);
            resolve({
                tokenAddress,
                tokenType,
            });
        });
    }));
    console.log('response length: ', resp.length);
    console.log('erc20 count: ', resp.filter((item) => item.tokenType === TokenType_1.default.ERC20).length);
    console.log('erc721 count: ', resp.filter((item) => item.tokenType === TokenType_1.default.ERC721).length);
    console.log('erc1155 count: ', resp.filter((item) => item.tokenType === TokenType_1.default.ERC1155).length);
    console.log('unknown count: ', resp.filter((item) => item.tokenType === TokenType_1.default.UNKNOWN).length);
    const endTime = new Date().getTime();
    console.log(`running time: ${endTime - startTime} ms`);
};
main().then();
//# sourceMappingURL=main.js.map