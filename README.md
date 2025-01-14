# EVM TOKEN INDEXER

node, typescript, ethers, typeorm, postgresql, redis cache

- Provide proper `.env` file in root directory, an example can be found in `.env.example`.
- set `PRODUCTION` key in `.env` to `1` for using production mode (connect to remote redis, remote posgressql, remote rabbitmq,..)

# Available scripts

- install dependencies: `npm install`
- run application: `npm start`
- run worker: `npm run worker {WorkerName}` ex: `npm run worker FilterEvent`
- List available workers: `npm run list-workers`
- eslint fix:`npm run lint`
- typescript build:`npm run build`
- to run built js version: `node build/main.js` run worker: `node build/main.js {WorkerName}`

# Logger:

- Winston logger for nodejs
- Log levels:

```javascript
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}
```

- Read all errors log in `/error.log`, log with level of `info` or less in `/combined.log`
