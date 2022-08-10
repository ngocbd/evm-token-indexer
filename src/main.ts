import ReadTransferEventWorker from "./workers/ReadTransferEventWorker";
import {ETH_MAIN_NET_RPC_URL} from "./constants";
import {utils} from "ethers";
import TokenType from "./enums/TokenType";

const main = async () => {
  //TEST
  const startTime = new Date().getTime();
  const worker = new ReadTransferEventWorker(ETH_MAIN_NET_RPC_URL);
  const filter = {
    topics: [
      utils.id("Transfer(address,address,uint256)"),
    ],
    fromBlock: 15_311_816,
    toBlock: 15_311_826,
  };
  const logs = await worker.provider.getLogs(filter);
  console.log("transfer events count: ", logs.length);
  console.log("blocks length: ", filter.toBlock - filter.fromBlock);
  const resp = await Promise.all(logs.map(async (log) => {
    const tokenAddress = log.address;
    return new Promise(async (resolve, reject) => {
      const tokenType = await worker.detectTokenType(tokenAddress)
      resolve({
        tokenAddress,
        tokenType,
      })
    })
  }));
  console.log("response length: ", resp.length)
  console.log("erc20 count: ", resp.filter((item: any) => item.tokenType === TokenType.ERC20).length)
  console.log("erc721 count: ", resp.filter((item: any) => item.tokenType === TokenType.ERC721).length)
  console.log("erc1155 count: ", resp.filter((item: any) => item.tokenType === TokenType.ERC1155).length)
  console.log("unknown count: ", resp.filter((item: any) => item.tokenType === TokenType.UNKNOWN).length);
  const endTime = new Date().getTime();
  console.log(`running time: ${endTime - startTime} ms`);
}

main().then();
