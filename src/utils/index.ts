import { BigNumber, ethers } from 'ethers';
import logger from '../logger';
import * as amqp from 'amqplib';
import { RABBITMQ_URL } from '../constants';

export const deletePadZero = (hexNumber: string) => {
  if (!hexNumber) return '';
  return hexNumber.replace(/^(0x)0+((\w{4})+)$/, '$1$2');
};
export const getContract = (
  address: string,
  abi: any,
  provider: ethers.providers.JsonRpcProvider,
) => {
  return new ethers.Contract(address, abi, provider);
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getQueueStatus(
  queueName: string,
): Promise<{ queue: string; messageCount: number; consumerCount: number }> {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);

    const channel = await connection.createConfirmChannel();

    const queue = await channel.assertQueue(queueName, {
      durable: false,
    });
    return queue;
  } catch (err) {
    logger.error('AMPQ error: ', err);
    return null;
  }
}


export const convertFromHexToNumberString = (input: any) => {
  try {
    return BigNumber.from(input).toString();

  } catch (err) {
    logger.error('convertFromHexToNumberString error: ', err?.message);
    return null;
  }
}

export const isValidAddress = (address: string) => {
  const isValid = ethers.utils.isAddress(address);
  const isZeroAddress = address === ethers.constants.AddressZero;
  return isValid && !isZeroAddress;
}


export const measurePromise = (fn: () => Promise<any>): Promise<{res: any, duration: number}> => {
  let onPromiseDone = (res: any) => {
    const duration = performance.now() - start;
    return { res, duration };
  }

  let start = performance.now();
  return fn().then(onPromiseDone, onPromiseDone);
}
