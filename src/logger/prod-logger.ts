import { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json } = format;

const buildProdLogger = (): Logger => {
  return createLogger({
    format: combine(timestamp(), errors({ stack: true }), json()),
    defaultMeta: { service: 'evm-token-indexer' },
    transports: [new transports.Console()],
  });
};

export default buildProdLogger;
