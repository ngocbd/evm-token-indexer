# EVM TOKEN INDEXER

node, typescript, ethers, typeorm, postgresql

- Provide proper `.env` file in root directory, an example can be found in `.env.example`.

# Available scripts

- install dependencies: `npm install`
- run application: `npm start`
- run worker: `npm run worker {WorkerName}` ex: `npm run worker FilterEvent`
- List available workers: `npm run list-workers`
- eslint fix:`npm run lint`
- typescript build:`npm run build` 
- to run built js version: `node dist/main.js` run worker: `node dist/main.js {WorkerName}`
