import { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json } = format;

const buildProdLogger = (): Logger => {
  return createLogger({
    format: combine(timestamp(), errors({ stack: true }), json()),
    defaultMeta: { service: 'evm-token-indexer' },
    transports: [
      new transports.Console(),
      //
      // - Write all logs with importance level of `error` or less to `error.log`
      // - Write all logs with importance level of `info` or less to `combined.log`
      //
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' }),
    ],
  });
};

export default buildProdLogger;
