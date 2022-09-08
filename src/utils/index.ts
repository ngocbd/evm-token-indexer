import { ethers } from 'ethers';
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

export const getQueueStatus = async (queueName: string) => {
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
};
