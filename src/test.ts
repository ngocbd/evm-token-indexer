import {AppDataSource} from "./data-source";
import logger from "./logger";
import {BigNumber, ethers, utils} from "ethers";
import {CLOUD_FLARE_GATEWAY_ETH_RPC_URL} from "./constants";
import {TokenContractService, TransferEventService} from "./services";
import {TokenBalance, TransferEvent} from "./entity";
import TokenBalanceService from "./services/TokenBalanceService";


const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    CLOUD_FLARE_GATEWAY_ETH_RPC_URL,
  );

  const transferEventServices = new TransferEventService();
  const tokenBalanceService = new TokenBalanceService();
  let res: TransferEvent[] = await transferEventServices.getERC20TransferEventsBetween(35, 37);
  console.log("Query result: ", res.length);
  // group by token address
  const transferEventsMap = new Map<string, TransferEvent[]>(); // address => transfer events
  res.forEach((transferEvent: TransferEvent) => {
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
  console.log("tokenBalanceMap: ", tokenBalanceMap);
  // save to db
  for (const address of tokenBalanceMap.keys()) {
    const tokenBalances = tokenBalanceMap.get(address);
    for (let i = 0; i < tokenBalances.length; i++) {
      const tokenBalance = tokenBalances[i];
      const exist = await tokenBalanceService.findByTokenAndOwner(tokenBalance.token, tokenBalance.owner);
      let saved = null;
      if (exist) {
        const currentBalance = BigNumber.from(exist.balance);
        const newBalance = BigNumber.from(tokenBalance.balance);
        const totalBalance = currentBalance.add(newBalance);
        exist.balance = totalBalance.toString();
        saved = await tokenBalanceService.save(exist);
      } else {
        saved = await tokenBalanceService.save(tokenBalance);
      }
      console.log("saved: ", saved);
    }
  }

};

AppDataSource.initialize()
  .then(main)
  .catch((error) => {
    logger.error('init error: ' + error);
  });

