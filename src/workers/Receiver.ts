import * as amqp from 'amqplib';
import 'dotenv/config';

export default class Receiver {
  private readonly _queueName: string;
  private static _rabbitMQConnection: amqp.Connection;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  async consumeMessage(messageHandler: (message: string) => any) {
    let connection = Receiver._rabbitMQConnection;
    if (!connection) {
      console.log('[AMQP] create connection');
      connection = await amqp.connect(process.env.RABBITMQ_URL);
      Receiver._rabbitMQConnection = connection;
    }
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue(this._queueName, {
      durable: false,
    });
    console.log(
      ' [*] Waiting for messages in %s. To exit press CTRL+C',
      this._queueName,
    );
    channel.consume(this._queueName, (msg) => {
      const msqContent = msg.content.toString();
      //remove message from queue only when messageHandler is done
      messageHandler(msqContent).then(() => {
        channel.ack(msg);
      });
    });
  }
}
