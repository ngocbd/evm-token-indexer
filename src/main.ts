import {ETH_MAIN_NET_RPC_URL, FOUR_BYTES_ETH_RPC_URL, RABBITMQ_QUEUE_NAME} from './constants';
import {utils} from 'ethers';
import TokenType from './enums/TokenType';
import {AppDataSource} from './data-source';
import {TokenContractService} from './services';
//typeorm migration
import 'reflect-metadata';
import {Publisher, ReadTransferEventWorker} from "./workers";
import Receiver from "./workers/Receiver";

const main = async () => {
  //TEST
  console.log(process.argv);
  const appCommandLineArgs = process.argv.slice(2);
  // const tokenContractService = new TokenContractService();
  // const listTokens = await tokenContractService.findAll();
  const testReadTransferEvent = async () => {
    const startTime = new Date().getTime();
    const worker = new ReadTransferEventWorker(ETH_MAIN_NET_RPC_URL);
    // console.log(await worker.provider.get());
    const filter = {
      topics: [utils.id('Transfer(address,address,uint256)')],
      fromBlock: 10_084_070,
      toBlock: 10_084_072,
    };
    const logs = await worker.provider.getLogs(filter);
    console.log('transfer events count: ', logs.length);
    console.log('blocks length: ', filter.toBlock - filter.fromBlock);
    const resp = await Promise.all(
      logs.map(async (log) => {
        const tokenAddress = log.address;
        return new Promise(async (resolve, reject) => {
          const tokenType = await worker.detectTokenType(tokenAddress);
          resolve({
            tokenAddress,
            tokenType,
          });
        });
      }),
    );
    console.log('response length: ', resp.length);
    console.log(
      'erc20 count: ',
      resp.filter((item: any) => item.tokenType === TokenType.ERC20).length,
    );
    console.log(
      'erc721 count: ',
      resp.filter((item: any) => item.tokenType === TokenType.ERC721).length,
    );
    console.log(
      'erc1155 count: ',
      resp.filter((item: any) => item.tokenType === TokenType.ERC1155).length,
    );
    console.log(
      'unknown count: ',
      resp.filter((item: any) => item.tokenType === TokenType.UNKNOWN).length,
    );
    const endTime = new Date().getTime();
    console.log(`running time: ${endTime - startTime} ms`);
  };
  // await testReadTransferEvent();

  if (appCommandLineArgs.length > 0) {
    const workerTye = appCommandLineArgs[0];
    if (workerTye === 'publisher') {
      const publisher = new Publisher(RABBITMQ_QUEUE_NAME);
      await publisher.pushMessage('hello world');
      setTimeout(() => {
        process.exit(0);
      },500)
    } else if (workerTye === 'receiver') {
      const receiver = new Receiver(RABBITMQ_QUEUE_NAME);
      await receiver.consumeMessage((message) => {
        console.log("received message: ", message);
      });
    }
  }
};

AppDataSource.initialize()
  .then(async () => {
    await main();
  })
  .catch((error) => {
    console.log('init error: ', error);
  });
