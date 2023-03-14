import * as amqp from 'amqplib';
import logger from '../logger';
import { RABBITMQ_URL } from '../constants';

export default class RabbitMqService {
  private _rabbitMQConnection: amqp.Connection;
  private _rabbitMQChannel: amqp.Channel;

  //init connection and channel and queue if not exist
  async init(queueName: string) {
    try {
      console.log('[AMQP] create connection');
      this._rabbitMQConnection = await amqp.connect(RABBITMQ_URL);

      
      this._rabbitMQChannel = await this._rabbitMQConnection.createChannel();
      //consume one message at a time
      // this._rabbitMQChannel.prefetch(100);
      await this._rabbitMQChannel.assertQueue(queueName, {
        durable: false,
      });
      return this;
    } catch (err: any) {
      logger.error('AMPQ init connection error: ', err);
      return null;
    }
  }

  async getQueueStatus(
    queueName: string,
  ): Promise<{ queue: string; messageCount: number; consumerCount: number }> {
    try {
      if (!this._rabbitMQChannel || !this._rabbitMQConnection) {
        await this.init(queueName);
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
        await this.init(queueName);
      }

      await this._rabbitMQChannel.sendToQueue(queueName, Buffer.from(message));
      return true;
    } catch (err: any) {
      logger.error(`AMPQ push ${message} to ${queueName} failed `, err);
      return null;
    }
  }

  async consumeMessage(
    queueName: string,
    messagePerConsumer: number | undefined,
    messageHandler: (message: string) => Promise<any>,
  ) {
    try {
      if (!this._rabbitMQChannel || !this._rabbitMQConnection) {
        await this.init(queueName);
      }
      if (messagePerConsumer) {
        this._rabbitMQChannel.prefetch(messagePerConsumer);
      }
      await this._rabbitMQChannel.consume(
        queueName,
        (message) => {
          if (message) {
            const msqContent = message.content.toString();
            //remove message from queue only when messageHandler is done
            messageHandler(msqContent).then(() => {
              this._rabbitMQChannel.ack(message);
            });
          }
        },
        {
          noAck: false,
        },
      );
      return true;
    } catch (err: any) {
      logger.error(`AMPQ consume ${queueName} failed `, err);
      return null;
    }
  }

  close() {
    if (!this._rabbitMQConnection) {
      return;
    }
    this._rabbitMQConnection.close();
  }
}
