import * as amqp from 'amqplib';
import 'dotenv/config';

export default class Publisher {
  private readonly _queueName: string;
  private static _rabbitMQConnection: amqp.Connection;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  async pushMessage(message: string) {
    try {
      let connection = Publisher._rabbitMQConnection;
      if (!connection) {
        console.log('[AMQP] create connection');
        connection = await amqp.connect(process.env.RABBITMQ_URL);
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
      const channel = await connection.createChannel();
      await channel.assertQueue(this._queueName, {
        durable: false,
      });
      await channel.sendToQueue(this._queueName, Buffer.from(message));
      console.log('[AMQP] Sent %s', message);
    } catch (err) {
      console.error('[AMQP]', err.message);
      // return setTimeout(this.setupRabbitMQ, 1000);
    }
  }
}
