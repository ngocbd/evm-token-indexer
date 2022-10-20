import {RabbitMqService, TransferEventService} from "../services";
import {TransferEvent} from "../entity";
import logger from "../logger";
import {DELETE_DUPLICATE_QUEUE_NAME} from "../constants";

export default class DeleteDuplicateWorker {
  _rabbitMqService: RabbitMqService;
  _transferEventService: TransferEventService;

  constructor() {
    this._rabbitMqService = new RabbitMqService();
    this._transferEventService = new TransferEventService()
  }


  async deleteDuplicate(message: string) {
    try {
      const data: { startOffset: number, deletePerPage: number } = JSON.parse(message);
      const {startOffset, deletePerPage} = data;
      const startQuery = new Date().getTime();
      const res = await this._transferEventService.getTransferEventBetween(startOffset, startOffset + deletePerPage);
      const endQuery = new Date().getTime();
      logger.info(`id from: ${startOffset} to ${startOffset + deletePerPage} took ${endQuery - startQuery} ms return ${res.length} rows`);
      if (res.length === 0) {
        logger.info("query is empty return");
        return;
      }

      const deleteStart = new Date().getTime();
      const transferEventsMap = new Map<string, TransferEvent[]>();
      res.forEach((item) => {
        const mapKey = item.tx_hash.concat("_").concat(item.log_index.toString());
        if (!transferEventsMap.has(mapKey)) {
          transferEventsMap.set(mapKey, [item]);
        } else {
          const events = transferEventsMap.get(mapKey) as TransferEvent[];
          events.push(item);
          transferEventsMap.set(mapKey, events);
        }
      });
      //find duplicate
      for (const key of transferEventsMap.keys()) {
        const events = transferEventsMap.get(key);
        if (events.length > 1) {
          logger.info(`id from: ${startOffset} to ${startOffset + deletePerPage} Found duplicated at ${key} with length ${events.length}`);
          const copiedEvents = [...events];
          copiedEvents.shift();
          await this._transferEventService.remove(copiedEvents);
          for (let i = 0; i < copiedEvents.length; i++) {
            logger.info(`id from: ${startOffset} to ${startOffset + deletePerPage} Deleted success: ${copiedEvents[i].tx_hash} ${copiedEvents[i].log_index}`);
          }
        }
      }
      const deleteEnd = new Date().getTime();
      logger.info(`id from: ${startOffset} to ${startOffset + deletePerPage} delete took ${deleteEnd - deleteStart} ms`);
      transferEventsMap.clear();
    } catch (err: any) {
      logger.error(err);
      return null;
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      DELETE_DUPLICATE_QUEUE_NAME,
      10,
      this.deleteDuplicate.bind(this)
    );
  }
}