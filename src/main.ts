import {
  FOUR_BYTES_ETH_RPC_URL,
  LIST_AVAILABLE_WORKERS,
  RABBITMQ_QUEUE_NAME,
} from './constants';
import { BigNumber, ethers } from 'ethers';
import { AppDataSource } from './data-source';
//typeorm migration
import 'reflect-metadata';
import {
  FilterEventWorker,
  Publisher,
  PushEventWorker,
  SaveDataWorker,
} from './workers';
import Receiver from './workers/Receiver';

const main = async () => {
  //TEST
  const bigNumber = BigNumber.from(
    '0x0000000000000000000000000000000000000000000000052769477a7d940000',
  );
  console.log(bigNumber.toString());
  const appCommandLineArgs = process.argv.slice(2);
  const provider = new ethers.providers.JsonRpcProvider(FOUR_BYTES_ETH_RPC_URL);
  const transaction = await provider.getTransaction(
    '0x621cc227d668e00d6e46fa64a38fd0e167af451cfe36a7a2ade9cee7f91cc873',
  );
  const signature =
    transaction.r.slice(2) + transaction.s.slice(2) + transaction.v.toString();
  console.log(transaction);
  console.log({ signature });
  if (appCommandLineArgs.length > 0) {
    const workerName = appCommandLineArgs[0];
    switch (workerName) {
      case LIST_AVAILABLE_WORKERS.SaveDataWorker:
        await new SaveDataWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.FilterEventWorker:
        await new FilterEventWorker(provider).run();
        break;
      case LIST_AVAILABLE_WORKERS.PushEventWorker:
        const pushEventWorker = new PushEventWorker(provider);
        await pushEventWorker.run(10_000_000, 10_000_002);
        break;
      case LIST_AVAILABLE_WORKERS.ReceiverWorker:
        await new Receiver(RABBITMQ_QUEUE_NAME).consumeMessage((msg) => {
          console.log(msg);
        });
        break;
      case LIST_AVAILABLE_WORKERS.PublisherWorker:
        const publisherWorker = new Publisher(RABBITMQ_QUEUE_NAME);
        for (let i = 0; i < 10; i++) {
          await publisherWorker.pushMessage('Em huy dz hai ba ' + i);
        }
        break;
      case 'list-workers':
        console.log('Available workers: ');
        console.log(LIST_AVAILABLE_WORKERS);
        break;
      default:
        console.error(`Worker ${workerName} is not available`);
        console.log('Available workers: ');
        console.log(LIST_AVAILABLE_WORKERS);
        break;
    }
  }
};

AppDataSource.initialize()
  .then(async () => {
    await main();
    return;
  })
  .catch((error) => {
    console.log('init error: ', error);
  });
