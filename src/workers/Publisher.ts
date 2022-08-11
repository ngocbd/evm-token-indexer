import * as amqp from 'amqplib';
import 'dotenv/config';

export default class Publisher {
  _queueName: string;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  async pushMessage(message: string) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      const channel = await connection.createChannel();
      await channel.assertQueue(this._queueName, {
        durable: false
      });
      await channel.sendToQueue(this._queueName, Buffer.from(message));
      console.log("Publisher Sent %s", message);
      return;
    } catch (err) {
      console.log(err)
    }
  }
}
