import buildDevLogger from './dev-logger';
import buildProdLogger from './prod-logger';
import 'dotenv/config';

const logger =
  +process.env.PRODUCTION === 0 ? buildDevLogger() : buildProdLogger();
export default logger;
