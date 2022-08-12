import * as amqp from 'amqplib';
import 'dotenv/config';

export default class Receiver {
  private readonly _queueName: string;
  private static _rabbitMQConnection: amqp.Connection;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  async consumeMessage(messageHandler: (message: string) => void) {
    let connection = Receiver._rabbitMQConnection;
    if (!connection) {
      console.log('[AMQP] create connection');
      connection = await amqp.connect(process.env.RABBITMQ_URL);
      Receiver._rabbitMQConnection = connection;
    }
    const channel = await connection.createChannel();
    await channel.assertQueue(this._queueName, {
      durable: false,
    });
    console.log(
      ' [*] Waiting for messages in %s. To exit press CTRL+C',
      this._queueName,
    );
    channel.consume(
      this._queueName,
      async (msg) => {
        const msqContent = msg.content.toString();
        await messageHandler(msqContent);
      },
      {
        noAck: true,
      },
    );
  }
}
