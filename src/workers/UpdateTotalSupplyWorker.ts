import {TokenContractService} from "../services";
import {ethers} from "ethers";
import {getContract} from "../utils";
import {ERC20_ABI} from "../constants";
import logger from "../logger";

export default class UpdateTotalSupplyWorker {
  private readonly _tokenContractService: TokenContractService;
  private readonly _provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this._tokenContractService = new TokenContractService();
    this._provider = provider;
  }

  async getTokenSupply(tokenAddress: string): Promise<string> {
    try {
      const erc20Contract = getContract(
        tokenAddress,
        ERC20_ABI,
        this._provider,
      );
      const totalSupply = await erc20Contract.totalSupply();
      return totalSupply.toString();
    } catch (err) {
      return null;
    }
  }

  async run() {
    logger.info('UpdateTotalSupplyWorker started');
    const startTime = Date.now();
    const tokens = await this._tokenContractService.findAllValidatedERC20Token();

    for (const token of tokens) {
      try {
        const totalSupply = await this.getTokenSupply(token.address);
        if (!totalSupply) {
          continue;
        }
        console.log(totalSupply)
        token.total_supply = totalSupply;
        const updated = await this._tokenContractService.update(token);
        logger.info(`Updated token ${updated.address} total supply ${updated.total_supply}`);
      } catch (err) {
        logger.error(err);
      }
    }
    const endTime = Date.now();
    logger.info(`Updated total supply for ${tokens.length} tokens in ${endTime - startTime} ms`);
  }
}
