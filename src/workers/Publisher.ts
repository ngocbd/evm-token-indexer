import * as amqp from 'amqplib';
import 'dotenv/config';
import logger from '../logger';
import {RABBITMQ_URL} from '../constants';

export default class Publisher {
  private readonly _queueName: string;
  private static _rabbitMQConnection: amqp.Connection;
  private static _rabbitMQChannel;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  async getReceiverCount() {
    try {
      let connection = Publisher._rabbitMQConnection;
      if (!connection) {
        console.log('[AMQP] create connection');
        connection = await amqp.connect(RABBITMQ_URL);

        Publisher._rabbitMQConnection = connection;
      }
      connection.on('error', function (err) {
        if (err.message !== 'Connection closing') {
          console.error('[AMQP] conn error', err.message);
        }
      });
      // connection.on("close", () => {
      //   console.error("[AMQP] reconnecting");
      //   return setTimeout(async () => await this.pushMessage(message), 1000);
      // });
      let channel = Publisher._rabbitMQChannel;
      if (!channel) {
        console.log('[AMQP] create channel');
        channel = await connection.createChannel();
        Publisher._rabbitMQChannel = channel;
      }
      const queue = await channel.assertQueue(this._queueName, {
        durable: false,

      });
      return queue.consumerCount;
    } catch (err) {
      logger.error('AMPQ error: ', err);
      return 0;
      // return setTimeout(this.setupRabbitMQ, 1000);
    }
  }

  async pushMessage(message: string) {
    try {
      let connection = Publisher._rabbitMQConnection;
      if (!connection) {
        console.log('[AMQP] create connection');
        connection = await amqp.connect(RABBITMQ_URL);
        Publisher._rabbitMQConnection = connection;
      }

      let channel = Publisher._rabbitMQChannel;
      if (!channel) {
        console.log('[AMQP] create channel');
        channel = await connection.createChannel();
        Publisher._rabbitMQChannel = channel;
      }
      const queue = await channel.assertQueue(this._queueName, {
        durable: false,
      });
      await channel.sendToQueue(this._queueName, Buffer.from(message));
      return queue;
    } catch (err) {
      logger.error('AMPQ error: ', err);
      return null;
      // return setTimeout(this.setupRabbitMQ, 1000);
    }
  }
}
