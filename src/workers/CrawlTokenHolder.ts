// ✅ Do this if using TYPESCRIPT
import {RequestInfo, RequestInit} from 'node-fetch';

const fetch = (url: RequestInfo, init?: RequestInit) =>
  import('node-fetch').then(({default: fetch}) => fetch(url, init));
import {JSDOM} from 'jsdom';
import {ethers} from "ethers";
import {parseUnits} from "ethers/lib/utils";
import {getContract} from "../utils";
import {CRAWL_TOKEN_HOLDER_QUEUE_NAME, ERC20_ABI} from "../constants";
import {TokenBalance} from "../entity";
import TokenBalanceService from "../services/TokenBalanceService";
import logger from "../logger";
import {RabbitMqService} from "../services";

export default class CrawlTokenHolder {
  _provider: ethers.providers.JsonRpcProvider;
  _tokenBalanceService: TokenBalanceService;
  _rabbitMqService: RabbitMqService;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._provider = provider;
    this._tokenBalanceService = new TokenBalanceService();
    this._rabbitMqService = new RabbitMqService();
  }

  private async getWebsiteContent(url: string): Promise<string> {
    // Simple HTTP call
    const content = await fetch(url);
    return  await content.text();
  };

  //implement retries logic
  public async crawlTokenHolder(tokenAddress: string) {
    try {
      const url = `https://etherscan.io/token/tokenholderchart/${tokenAddress}?range=500`
      const websiteHtml = await this.getWebsiteContent(url);
      const dom: JSDOM = new JSDOM(websiteHtml);
      const doc: Document = dom.window.document;
      //get token decimal
      const erc20Contract = getContract(
        tokenAddress,
        ERC20_ABI,
        this._provider,
      );
      const decimalsNumber: number = await erc20Contract.decimals();
      const tokenHolderTable = doc.querySelector("table.table.table-hover");
      tokenHolderTable.querySelectorAll("tr").forEach((tr, index) => {
        if (index === 0) {
          return
        }
        const td = tr.querySelectorAll("td")
        const address = td[1].querySelector("a").href.split("?a=").pop()
        const balance = parseFloat(td[2].textContent.replace(/,/g, ''))

        const balanceBigNumber = parseUnits(balance.toString(), decimalsNumber)
        //Save to database
        const tokenBalance = new TokenBalance();
        tokenBalance.token = tokenAddress;
        tokenBalance.token_id = "-1";
        tokenBalance.owner = address;
        tokenBalance.balance = BigInt(balanceBigNumber.toString());
        this._tokenBalanceService.save(tokenBalance);
        logger.info(`Saved success for token: ${tokenAddress} address: ${address} balance: ${balanceBigNumber.toString()}`);
      })
    } catch (err) {
      logger.error(`Crawl token holder failed for token: ${tokenAddress} : ${err}`);
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      CRAWL_TOKEN_HOLDER_QUEUE_NAME,
      1,
      this.crawlTokenHolder.bind(this)
    );
  }
}