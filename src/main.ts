import {
  FOUR_BYTES_ETH_RPC_URL,
  LIST_AVAILABLE_WORKERS,
  RABBITMQ_QUEUE_NAME,
} from './constants';
import { ethers } from 'ethers';
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
  const appCommandLineArgs = process.argv.slice(2);
  const provider = new ethers.providers.JsonRpcProvider(FOUR_BYTES_ETH_RPC_URL);
  if (appCommandLineArgs.length > 0) {
    const workerName = appCommandLineArgs[0];
    switch (workerName) {
      case LIST_AVAILABLE_WORKERS.SaveDataWorker:
        await new SaveDataWorker().run();
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
