import * as amqp from 'amqplib';
import 'dotenv/config';
import {channel} from "diagnostics_channel";

export default class Receiver {
  _queueName: string;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  async consumeMessage(messageHandler: (message: string) => void) {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(this._queueName, {
      durable: false
    });
    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", this._queueName);
    channel.consume(this._queueName, function (msg) {
      const msqContent = msg.content.toString();
      messageHandler(msqContent);
    }, {
      noAck: true
    });
  }
}