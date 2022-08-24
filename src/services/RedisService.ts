import {createClient, RedisClientType} from "redis";
import 'dotenv/config';
import logger from "../logger";

class RedisService {
  private _redisClient: RedisClientType = null;

  constructor() {

  }

  async init() {
    try {
      if (!this._redisClient) {
        console.log('Create new redis client')
        this._redisClient = createClient({
          url: +process.env.PRODUCTION === 1 ? process.env.REDIS_URL : "",
          password: +process.env.PRODUCTION === 1 ? process.env.REDIS_PASSWORD : "",
        })
      }
      await this._redisClient.connect();
      return this
    } catch (err: any) {
      logger.error('INIT REDIS SERVICE FAILED: ', err)
      return null
    }
  }

  async setValue(key: string, value: any) {
    try {
      if (!this._redisClient) await this.init()
      await this._redisClient.set(key, value);
    } catch (err: any) {
      logger.error(`REDIS SET [${key}] ${value} failed`, err)
    }
  }

  async getValue(key: string) {
    try {
      if (!this._redisClient) await this.init()
      return await this._redisClient.get(key);
    } catch (err: any) {
      logger.error(`REDIS GET [${key}] failed`, err)
      return null
    }
  }
}

export default RedisService