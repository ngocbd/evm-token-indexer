import { Interface } from 'ethers/lib/utils';
export declare const ERC721_INTERFACE_ID = "0x80ac58cd";
export declare const ERC1155_INTERFACE_ID = "0xd9b67a26";
export declare const SMART_CHAIN_TEST_NET_RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
export declare const ETH_MAIN_NET_RPC_URL = "https://rpc.ankr.com/eth";
export declare const ERC20_ABI: ({
    inputs: any[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
    name?: undefined;
    outputs?: undefined;
} | {
    anonymous: boolean;
    inputs: {
        indexed: boolean;
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
})[];
export declare const INTERFACE_ERC155_ABI: {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
}[];
export declare const ERC20_INTERFACE: Interface;
export declare const ERC20_HUMAN_READABLE_ABI: string | string[];
