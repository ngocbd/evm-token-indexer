import {
  RabbitMqService,
} from '../services';
import { BigNumber, ethers } from 'ethers';
import RedisService from '../services/RedisService';
import {
  ERC20_ABI,
  SAVE_TOKEN_BALANCE_QUEUE_NAME,
} from '../constants';
import TokenType from '../enums/TokenType';
import { Erc1155Balance, Erc20Balance, Erc721Balance } from '../entity';
import TokenBalanceService from '../services/TokenBalanceService';
import { getContract, isValidAddress } from '../utils';
import logger from '../logger';

class SaveBalanceWorker {
  _rabbitMqService: RabbitMqService;
  _provider: ethers.providers.JsonRpcProvider;
  _redisService: RedisService;
  _tokenBalanceService: TokenBalanceService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._rabbitMqService = new RabbitMqService();
    this._redisService = new RedisService();
    this._tokenBalanceService = new TokenBalanceService();
  }

  async getErc20Balance(tokenAddress: string, owner: string) {
    try {
      const erc20Contract = getContract(
        tokenAddress,
        ERC20_ABI,
        this._provider,
      );
      const toBalance = await erc20Contract.balanceOf(owner);
      return toBalance.toString();
    } catch (err) {
      logger.error(`Get erc20 balance for ${owner} failed with error: ${err}`);
      return '0';
    }
  }

  async saveErc20Balance(token: any, transferEvent: any) {
    try {
      const erc20Balance = new Erc20Balance();
      const tokenAddress = token.address;
      erc20Balance.token = tokenAddress;
      erc20Balance.decimals = isNaN(Number(token.decimal))
        ? 0
        : Number(token.decimal);
      erc20Balance.symbol = token.symbol;
      erc20Balance.name = token.name;
      //call contract to get balance
      if (isValidAddress(transferEvent.to)) {
        const toBalance = await this.getErc20Balance(
          tokenAddress,
          transferEvent.to,
        );
        await this._tokenBalanceService.saveErc20Balance({
          ...erc20Balance,
          owner: transferEvent.to,
          balance: toBalance,
        });
        logger.info(
          `Save erc20 balance for ${transferEvent.to} with balance ${toBalance}`,
        );
      }

      if (isValidAddress(transferEvent.from)) {
        const fromBalance = await this.getErc20Balance(
          tokenAddress,
          transferEvent.from,
        );
        await this._tokenBalanceService.saveErc20Balance({
          ...erc20Balance,
          owner: transferEvent.from,
          balance: fromBalance,
        });
        logger.info(
          `Save erc20 balance for ${transferEvent.from} with balance ${fromBalance}`,
        );
      }
    } catch (err) {
      logger.error(
        `Saved balance for ${transferEvent.from} and ${transferEvent.to} failed with error: ${err}`,
      );
    }
  }


  async saveErc721Balance(token: any, transferEvent: any) {
    try {
      if (isValidAddress(transferEvent.to)) {
        const toBalance =
          await this._tokenBalanceService.findErc721BalanceByTokenAndOwner(
            token.address,
            transferEvent.to,
          );
        if (!toBalance) {
          //save new
          const erc721Balance = new Erc721Balance();
          erc721Balance.token = token.address;
          erc721Balance.symbol = token.symbol;
          erc721Balance.name = token.name;
          erc721Balance.owner = transferEvent.to;
          erc721Balance.tokenIds = transferEvent.tokenId;
          await this._tokenBalanceService.saveErc721Balance(erc721Balance);
          logger.info(
            `First Add nft ${token.address} with id ${transferEvent.tokenId} to ${transferEvent.to}`,
          );
        } else {
          //update
          const tokenIds = toBalance.tokenIds.split(',');
          if (!tokenIds.includes(transferEvent.tokenId)) {
            tokenIds.push(transferEvent.tokenId);
            toBalance.tokenIds = tokenIds.join(',');
            await this._tokenBalanceService.saveErc721Balance(toBalance);
            logger.info(
              `Add nft ${token.address} with id ${transferEvent.tokenId} to ${transferEvent.to}`,
            );
          }
        }
      }

      if (isValidAddress(transferEvent.from)) {
        const fromBalance =
          await this._tokenBalanceService.findErc721BalanceByTokenAndOwner(
            token.address,
            transferEvent.from,
          );
        if (fromBalance) {
          //update
          const tokenIds = fromBalance.tokenIds.split(',');
          const index = tokenIds.indexOf(transferEvent.tokenId);
          if (index > -1) {
            tokenIds.splice(index, 1);
            fromBalance.tokenIds = tokenIds.join(',');
            await this._tokenBalanceService.saveErc721Balance(fromBalance);
            logger.info(
              `Remove nft ${token.address} with id ${transferEvent.tokenId} from ${transferEvent.from}`,
            );
          }
        } else {
          //save new
          const erc721Balance = new Erc721Balance();
          erc721Balance.token = token.address;
          erc721Balance.symbol = token.symbol;
          erc721Balance.name = token.name;
          erc721Balance.owner = transferEvent.from;
          erc721Balance.tokenIds = '';
          await this._tokenBalanceService.saveErc721Balance(erc721Balance);
          logger.info(
            `First Remove nft ${token.address} with id ${transferEvent.tokenId} from ${transferEvent.from}`,
          );
        }
      }
    } catch (err) {
      logger.error(
        `Saved balance for ${transferEvent.from} and ${transferEvent.to} failed with error: ${err}`,
      );
    }
  }

  async saveErc1155Balance(token: any, transferEvent: any) {
    try {
      if (isValidAddress(transferEvent.to)) {
        const toBalance = await this._tokenBalanceService.findErc1155BalanceByTokenAndOwner(token.address, transferEvent.to);
        if (!toBalance) {
          //save new
          const erc1155Balance = new Erc1155Balance();
          erc1155Balance.token = token.address;
          erc1155Balance.amount = transferEvent.amount;
          erc1155Balance.owner = transferEvent.to;
          erc1155Balance.tokenId = transferEvent.tokenId;
          const saved = await this._tokenBalanceService.saveErc1155Balance(erc1155Balance);
          logger.info(`First Add erc1155 ${token.address} with id ${transferEvent.tokenId} to ${transferEvent.to}`);
        } else {
          // update
          for (const balance of toBalance) {
            if (balance.tokenId === transferEvent.tokenId) {
              balance.amount = BigNumber.from(balance.amount).add(BigNumber.from(transferEvent.amount)).toString();
              await this._tokenBalanceService.saveErc1155Balance(balance);
            } else {
              const erc1155Balance = new Erc1155Balance();
              erc1155Balance.token = token.address;
              erc1155Balance.amount = transferEvent.amount;
              erc1155Balance.owner = transferEvent.to;
              erc1155Balance.tokenId = transferEvent.tokenId;
              await this._tokenBalanceService.saveErc1155Balance(erc1155Balance);
            }
          };
        }
      }

      if (isValidAddress(transferEvent.from)) {
        const fromBalance = await this._tokenBalanceService.findErc1155BalanceByTokenAndOwner(token.address, transferEvent.from);
        if (!fromBalance) {
          //add new
          const erc1155Balance = new Erc1155Balance();
          erc1155Balance.token = token.address;
          erc1155Balance.amount = '0'
          erc1155Balance.owner = transferEvent.from;
          erc1155Balance.tokenId = transferEvent.tokenId;
          await this._tokenBalanceService.saveErc1155Balance(erc1155Balance);
          logger.info(`First Remove erc1155 ${token.address} with id ${transferEvent.tokenId} from ${transferEvent.from}`);
        } else {
          // update
          for (const balance of fromBalance) {
            if (balance.tokenId === transferEvent.tokenId) {
              balance.amount = BigNumber.from(balance.amount).sub(BigNumber.from(transferEvent.amount)).toString();
              await this._tokenBalanceService.saveErc1155Balance(balance);
            } else {
              const erc1155Balance = new Erc1155Balance();
              erc1155Balance.token = token.address;
              erc1155Balance.amount = '0'
              erc1155Balance.owner = transferEvent.from;
              erc1155Balance.tokenId = transferEvent.tokenId;
              await this._tokenBalanceService.saveErc1155Balance(erc1155Balance);
            }
          };
        }
      }
    } catch (err) {
      logger.error(`Saved balance for ${transferEvent.from} and ${transferEvent.to} failed with error: ${err}`);
    }
  }

  async saveTokenBalance(message: string) {
    const { token, transferEvent } = JSON.parse(message);
    switch (token.type) {
      case TokenType.ERC20:
        await this.saveErc20Balance(token, transferEvent);
        break;
      case TokenType.ERC721:
        await this.saveErc721Balance(token, transferEvent);
        break;
      case TokenType.ERC1155:
        await this.saveErc1155Balance(token, transferEvent);
        break;
      default:
        break;
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      SAVE_TOKEN_BALANCE_QUEUE_NAME,
      2_000,
      this.saveTokenBalance.bind(this),
    );
  }
}

export default SaveBalanceWorker;
