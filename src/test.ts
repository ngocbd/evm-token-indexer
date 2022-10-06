import {
  CLOUD_FLARE_GATEWAY_ETH_RPC_URL, ETH_MAIN_NET_RPC_URL,
} from './constants';
import {ethers} from 'ethers';
import {PushEventWorker} from "./workers";



const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );
  // 11185957 => 11186057
  const worker = new PushEventWorker(provider);
  let count = 0;
  let start = 11185957;
  while (true) {
    await worker.getTransferLogs(start,start + 10);
    start += 10;
    count++;
    console.log(`Push event ${count} times`);
    // if(count === 10) {
    //   break;
    // }
  }

};

main().then();

