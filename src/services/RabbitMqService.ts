import * as amqp from 'amqplib';
import logger from "../logger";

export default class RabbitMqService {
  private _rabbitMQConnection: amqp.Connection;
  private _rabbitMQChannel: amqp.Channel;

  constructor() {
  }

  async init() {
    try {
      console.log('[AMQP] create connection');
      this._rabbitMQConnection = await amqp.connect(process.env.RABBITMQ_URL);
      this._rabbitMQChannel = await this._rabbitMQConnection.createChannel();
      return this;
    } catch (err: any) {
      logger.error('AMPQ init connection error: ', err);
      return null;
    }
  }

  async getQueueStatus(queueName: string): Promise<{ queue: string, messageCount: number, consumerCount: number }> {
    try {
      if (!this._rabbitMQChannel || !this._rabbitMQConnection) {
        await this.init();
      }
      const queue = await this._rabbitMQChannel.assertQueue(queueName, {
        durable: false,
      });
      return queue;
    } catch (err) {
      logger.error('AMPQ get queue status error: ', err);
      return null;
    }
  }

  async pushMessage(queueName: string, message: string) {
    try {
      if (!this._rabbitMQChannel || !this._rabbitMQConnection) {
        await this.init();
      }
      const queue = await this._rabbitMQChannel.assertQueue(queueName, {
        durable: false,
      });
      await this._rabbitMQChannel.sendToQueue(queueName, Buffer.from(message));
      return queue;
    } catch (err: any) {
      logger.error(`AMPQ push ${message} to ${queueName} failed `, err);
      return null;
    }

  }

  async consumeMessage(queueName: string, messageHandler: (message: string) => Promise<any>) {
    try {
      if (!this._rabbitMQChannel || !this._rabbitMQConnection) {
        await this.init();
      }
      const queue = await this._rabbitMQChannel.assertQueue(queueName, {
        durable: false,
      });
      await this._rabbitMQChannel.consume(queueName, (message) => {
        if (message) {
          const msqContent = message.content.toString();
          //remove message from queue only when messageHandler is done
          messageHandler(msqContent).then(() => {
            this._rabbitMQChannel.ack(message);
          });
        }
      });
      return queue;
    } catch (err: any) {
      logger.error(`AMPQ consume ${queueName} failed `, err);
      return null;
    }
  }

}