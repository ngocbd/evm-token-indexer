import {FormatTypes, Interface} from 'ethers/lib/utils';
import 'dotenv/config';
import {SaveBalanceWorker} from '../workers';

export const ERC721_INTERFACE_ID = '0x80ac58cd';
export const ERC1155_INTERFACE_ID = '0xd9b67a26';
export const PROXY_LOGIC_STORAGE =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const OPENZEPPELIN_PROXY_OLD_STORAGE =
  '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3';
export const SMART_CHAIN_TEST_NET_RPC_URL =
  'https://data-seed-prebsc-1-s1.binance.org:8545/';
export const ETH_MAIN_NET_RPC_URL = 'https://rpc.ankr.com/eth';
export const FOUR_BYTES_ETH_RPC_URL = 'https://erigon.4bytes.io';
export const FOUR_BYTES_LAN_ETH_RPC_URL = 'http://192.168.89.1/';
export const FOUR_BYTES_LAN_BSC_RPC_URL = 'http://192.168.89.1:8547/';
export const BSC_MAINNET_RPC_URL = 'https://bsc-dataseed.binance.org/';
export const CLOUD_FLARE_GATEWAY_ETH_RPC_URL =
  'https://cf.4bytes.io/v1/mainnet';
export const isProduction = +process.env.PRODUCTION === 1;
export const DATABASE_HOST: string = isProduction
  ? process.env.DATABASE_HOST
  : process.env.LOCAL_DATABASE_HOST;
export const DATABASE_PORT: number = isProduction
  ? +process.env.DATABASE_PORT
  : +process.env.LOCAL_DATABASE_PORT;
export const DATABASE_USERNAME: string = isProduction
  ? process.env.DATABASE_USERNAME
  : process.env.LOCAL_DATABASE_USERNAME;
export const DATABASE_PASSWORD: string = isProduction
  ? process.env.DATABASE_PASSWORD
  : process.env.LOCAL_DATABASE_PASSWORD;
export const getDatabaseName = () => {
  const network = process.env.NETWORK;
  switch (network) {
    case 'eth':
      if(isProduction) {
        return process.env.DATABASE_NAME
      } else {
        return process.env.LOCAL_DATABASE_NAME
      }
    case 'bsc':
      if(isProduction) {
        return process.env.BSC_DATABASE_NAME
      } else {
        return process.env.BSC_LOCAL_DATABASE_NAME
      }
    default:
      throw new Error('Network is not supported');
  }
}
export const DATABASE_SCHEMA: string = isProduction
  ? process.env.DATABASE_SCHEMA
  : process.env.LOCAL_DATABASE_SCHEMA;
export const RABBITMQ_URL: string = isProduction
  ? process.env.RABBITMQ_URL
  : process.env.LOCAL_RABBITMQ_URL;

export const ERC20_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {indexed: true, internalType: 'address', name: 'from', type: 'address'},
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      {internalType: 'address', name: 'owner', type: 'address'},
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'spender', type: 'address'},
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [{internalType: 'bool', name: '', type: 'bool'}],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{internalType: 'address', name: 'account', type: 'address'}],
    name: 'balanceOf',
    outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{internalType: 'uint8', name: '', type: 'uint8'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{internalType: 'string', name: '', type: 'string'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{internalType: 'string', name: '', type: 'string'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'to', type: 'address'},
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [{internalType: 'bool', name: '', type: 'bool'}],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'from', type: 'address'},
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {internalType: 'uint256', name: 'amount', type: 'uint256'},
    ],
    name: 'transferFrom',
    outputs: [{internalType: 'bool', name: '', type: 'bool'}],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
export const INTERFACE_ERC155_ABI = [
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export const ERC20_INTERFACE = new Interface(ERC20_ABI);
export const ERC_721_ABI = [
  {inputs: [], stateMutability: 'nonpayable', type: 'constructor'},
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {indexed: false, internalType: 'bool', name: 'approved', type: 'bool'},
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {indexed: true, internalType: 'address', name: 'from', type: 'address'},
      {indexed: true, internalType: 'address', name: 'to', type: 'address'},
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      {internalType: 'address', name: 'to', type: 'address'},
      {internalType: 'uint256', name: 'tokenId', type: 'uint256'},
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{internalType: 'address', name: 'owner', type: 'address'}],
    name: 'balanceOf',
    outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{internalType: 'uint256', name: 'tokenId', type: 'uint256'}],
    name: 'getApproved',
    outputs: [{internalType: 'address', name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'owner', type: 'address'},
      {internalType: 'address', name: 'operator', type: 'address'},
    ],
    name: 'isApprovedForAll',
    outputs: [{internalType: 'bool', name: '', type: 'bool'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{internalType: 'string', name: '_tokenURI', type: 'string'}],
    name: 'mint',
    outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{internalType: 'string', name: '', type: 'string'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{internalType: 'uint256', name: 'tokenId', type: 'uint256'}],
    name: 'ownerOf',
    outputs: [{internalType: 'address', name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'from', type: 'address'},
      {internalType: 'address', name: 'to', type: 'address'},
      {internalType: 'uint256', name: 'tokenId', type: 'uint256'},
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'from', type: 'address'},
      {internalType: 'address', name: 'to', type: 'address'},
      {internalType: 'uint256', name: 'tokenId', type: 'uint256'},
      {internalType: 'bytes', name: '_data', type: 'bytes'},
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'operator', type: 'address'},
      {internalType: 'bool', name: 'approved', type: 'bool'},
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{internalType: 'bytes4', name: 'interfaceId', type: 'bytes4'}],
    name: 'supportsInterface',
    outputs: [{internalType: 'bool', name: '', type: 'bool'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{internalType: 'string', name: '', type: 'string'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenCount',
    outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{internalType: 'uint256', name: 'tokenId', type: 'uint256'}],
    name: 'tokenURI',
    outputs: [{internalType: 'string', name: '', type: 'string'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {internalType: 'address', name: 'from', type: 'address'},
      {internalType: 'address', name: 'to', type: 'address'},
      {internalType: 'uint256', name: 'tokenId', type: 'uint256'},
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const ERC721_INTERFACE = new Interface(ERC_721_ABI);
export const ERC20_HUMAN_READABLE_ABI = ERC20_INTERFACE.format(
  FormatTypes.full,
);

export const SYNC_BLOCKS_RANGE = isProduction
  ? 'prod_blocks_range'
  : 'dev_blocks_range';
export const TRANSFER_EVETNS_SAVE_PER_MESSSAGE = isProduction
  ? 'prod_transfer_event_per_message'
  : 'dev_transfer_event_per_message';
export const TRANSACTION_SAVE_PER_MESSSAGE = isProduction
  ? 'prod_tx_per_message'
  : 'dev_tx_per_message';
export const LIST_AVAILABLE_WORKERS = {
  SaveTokenWorker: 'SaveToken',
  PushEventWorker: 'PushEvent',
  FilterEventWorker: 'FilterEvent',
  SaveLogWorker: 'SaveLog',
  SaveTransactionWorker: 'SaveTransaction',
  SaveBalanceWorker: 'SaveBalance',
  SaveTransferEventWorker: 'SaveTransferEvent',
  TestListener: 'TestListener',
  TestPusher: 'TestPusher',
};
//get queue name base on current network
export const getQueueName = () => {
  const network = process.env.NETWORK;
  switch (network) {
    case 'eth':
      return {
        EVENT_TRANSFER_QUEUE_NAME: 'evm-indexer-event-transfer',
        SAVE_LOG_QUEUE_NAME: 'evm-indexer-save-log',
        SAVE_DATA_QUEUE_NAME: 'evm-indexer-save-data',
        SAVE_TRANSFER_EVENT_QUEUE_NAME: 'evm-indexer-save-transfer_event',
        SAVE_TOKEN_BALANCE_QUEUE_NAME: 'evm-indexer-save-balance',
        PUSH_EVENT_ERROR_QUEUE_NAME: 'evm-indexer-push-event-error',
        SAVE_LOG_ERROR_QUEUE_NAME: 'evm-indexer-save-log-error',
        SAVE_TRANSACTION_QUEUE_NAME: 'evm-indexer-save-transaction',
        TEST_QUEUE_NAME: 'evm-indexer-test',
        lastReadBlockRedisKey: 'evm-push-event-worker-last-read-block',
        REDIS_LAST_SAVED_ERC1155_TRANSFER_EVENTS: "last-erc1155-transfer-events",
        SAVE_TRANSFER_EVENT_ERROR_QUEUE_NAME: 'evm-indexer-save-transfer-event-error',
      }
    case 'bsc':
      return {
        EVENT_TRANSFER_QUEUE_NAME: 'bsc-evm-indexer-event-transfer',
        SAVE_LOG_QUEUE_NAME: 'bsc-evm-indexer-save-log',
        SAVE_DATA_QUEUE_NAME: 'bsc-evm-indexer-save-data',
        SAVE_TRANSFER_EVENT_QUEUE_NAME: 'bsc-evm-indexer-save-transfer_event',
        SAVE_TOKEN_BALANCE_QUEUE_NAME: 'bsc-evm-indexer-save-balance',
        PUSH_EVENT_ERROR_QUEUE_NAME: 'bsc-evm-indexer-push-event-error',
        SAVE_LOG_ERROR_QUEUE_NAME: 'bsc-evm-indexer-save-log-error',
        SAVE_TRANSACTION_QUEUE_NAME: 'bsc-evm-indexer-save-transaction',
        TEST_QUEUE_NAME: 'bsc-evm-indexer-test',
        lastReadBlockRedisKey: 'bsc-evm-push-event-worker-last-read-block',
        REDIS_LAST_SAVED_ERC1155_TRANSFER_EVENTS: "bsc-last-erc1155-transfer-events",
        SAVE_TRANSFER_EVENT_ERROR_QUEUE_NAME: 'bsc-evm-indexer-save-transfer-event-error',
      }
    default:
      throw new Error('Network is not supported');
  }
}

