// ✅ Do this if using TYPESCRIPT
import {RequestInfo, RequestInit} from 'node-fetch';

const fetch = (url: RequestInfo, init?: RequestInit) =>
  import('node-fetch').then(({default: fetch}) => fetch(url, init));
import {JSDOM} from 'jsdom';
import {ethers} from "ethers";
import {parseUnits} from "ethers/lib/utils";
import {getContract, sleep} from "../utils";
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

  //implement retries logic
  private async getWebsiteContent(url: string, retries = 3): Promise<string> {
    try {
      const headers = {
        "user-agent":" Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36"
      }
      // Simple HTTP call
      const response = await fetch(url, {
        headers
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (err) {
      if (retries > 0) {
        //wait 2s and retry
        await sleep(2000);
        return this.getWebsiteContent(url, retries - 1);
      }
      throw err;
    }
  };


  public async crawlTokenHolder(tokenAddress: string) {
    try {
      const url = `https://etherscan.io/token/tokenholderchart/${tokenAddress}?range=500`
      const websiteHtml = await this.getWebsiteContent(url);
      logger.info(`Crawled website ${url}`);
      if (!websiteHtml) {
        throw new Error('Empty website content');
      }

      const dom: JSDOM = new JSDOM(websiteHtml);
      const doc: Document = dom.window.document;

      const tokenHolderTable = doc.querySelector("table.table.table-hover");
      if (!tokenHolderTable) {
        throw new Error('Cannot find token holder table');
      }
      //get token decimal
      const erc20Contract = getContract(
        tokenAddress,
        ERC20_ABI,
        this._provider,
      );
      const decimalsNumber: number = await erc20Contract.decimals();
      tokenHolderTable.querySelectorAll("tr").forEach((tr, index) => {
        try {
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
          tokenBalance.balance = balanceBigNumber.toString()
          this._tokenBalanceService.save(tokenBalance);
          logger.info(`Saved success for token: ${tokenAddress} address: ${address} balance: ${balanceBigNumber.toString()}`);
        } catch (saveError: any) {
          logger.error(`Save error for token: ${tokenAddress} error: ${saveError.message}`);
        }
      })
    } catch (err) {
      logger.error(`Crawl token holder failed for token: ${tokenAddress} : ${err}`);
    }
  }

  async run() {
    // await this.clearAllData();
    await this._rabbitMqService.consumeMessage(
      CRAWL_TOKEN_HOLDER_QUEUE_NAME,
      10,
      this.crawlTokenHolder.bind(this)
    );
  }
}