import TokenBalanceService from "../services/TokenBalanceService";
import {RabbitMqService, TransferEventService} from "../services";
import {TOKEN_BALANCE_QUEUE_NAME} from "../constants";
import logger from "../logger";
import {TokenBalance, TransferEvent} from "../entity";
import {BigNumber} from "ethers";

export default class TokenBalanceWorker {
  private readonly _tokenBalanceService: TokenBalanceService;
  private readonly _rabbitMqService: RabbitMqService;
  private readonly _transferEventService: TransferEventService;

  constructor() {
    this._tokenBalanceService = new TokenBalanceService();
    this._rabbitMqService = new RabbitMqService();
    this._transferEventService = new TransferEventService();
  }

  async insertTokenBalance(message: string) {
    const {from, to} = JSON.parse(message);
    try {
      //0 -> 35
      // 35 -> 37

      const queryRes: TransferEvent[] = await this._transferEventService.getERC20TransferEventsBetween(from, to);
      if (!queryRes || queryRes.length === 0) {
        logger.info(`No transfer events found between id ${from} and ${to}`);
        return;
      }
      // group by token address
      const transferEventsMap = new Map<string, TransferEvent[]>(); // address => transfer events
      queryRes.forEach((transferEvent: TransferEvent) => {
        const currentTokenAddress = transferEvent.address;
        if (!transferEventsMap.has(currentTokenAddress)) {
          transferEventsMap.set(currentTokenAddress, [transferEvent]);
        } else {
          const currentTokenTransferEvents = transferEventsMap.get(currentTokenAddress);
          currentTokenTransferEvents.push(transferEvent);
        }
      });
      //calculate balance
      const tokenBalanceMap = new Map<string, TokenBalance[]>(); // address => TokenBalance[]
      for (const address of transferEventsMap.keys()) {
        const transferEvents = transferEventsMap.get(address);
        const ownerBalanceMap = new Map<string, string>(); // owner => balance
        transferEvents.forEach((transferEvent: TransferEvent) => {
          if (!ownerBalanceMap.has(transferEvent.from)) {
            ownerBalanceMap.set(transferEvent.from, '0');
          }
          if (!ownerBalanceMap.has(transferEvent.to)) {
            ownerBalanceMap.set(transferEvent.to, '0');
          }
          const toBalance = ownerBalanceMap.get(transferEvent.to)
          const fromBalance = ownerBalanceMap.get(transferEvent.from)
          const amount = transferEvent.amount || '0';

          const amountBN = BigNumber.from(amount);
          const toBalanceBN = BigNumber.from(toBalance);
          const fromBalanceBN = BigNumber.from(fromBalance);
          const toNewBalance = toBalanceBN.add(amountBN);
          const fromNewBalance = fromBalanceBN.sub(amountBN);
          ownerBalanceMap.set(transferEvent.to, toNewBalance.toString());
          ownerBalanceMap.set(transferEvent.from, fromNewBalance.toString());
        })
        tokenBalanceMap.set(address, Array.from(ownerBalanceMap.entries()).map(([owner, balance]) => {
          return {
            token: address,
            token_id: "-1",
            owner,
            balance
          }
        }));
      }
      // save to db
      for (const address of tokenBalanceMap.keys()) {
        const tokenBalances = tokenBalanceMap.get(address);
        for (let i = 0; i < tokenBalances.length; i++) {
          const tokenBalance = tokenBalances[i];
          const exist = await this._tokenBalanceService.findByTokenAndOwner(tokenBalance.token, tokenBalance.owner);
          let saved = null;
          if (exist) {
            const currentBalance = BigNumber.from(exist.balance);
            const newBalance = BigNumber.from(tokenBalance.balance);
            const totalBalance = currentBalance.add(newBalance);
            exist.balance = totalBalance.toString();
            saved = await this._tokenBalanceService.save(exist);
          } else {
            saved = await this._tokenBalanceService.save(tokenBalance);
          }
          logger.info(`Id ${from} -> ${to}: Saved token balance ${JSON.stringify(saved)}`);
        }
      }
      //clear all map
      transferEventsMap.clear();
      tokenBalanceMap.clear();
    } catch (err: any) {
      logger.error(`${from} -> ${to} [TokenBalanceWorker] insert token balance failed: ${err.message}`);
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      TOKEN_BALANCE_QUEUE_NAME,
      1,
      this.insertTokenBalance.bind(this)
    );
  }
}


