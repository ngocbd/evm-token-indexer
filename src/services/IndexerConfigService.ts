import { Repository } from "typeorm";
import { IndexerConf } from "../entity";
import { AppDataSource } from "../data-source";

class IndexerConfigService {
  private readonly indexerConfigRepository: Repository<IndexerConf>;

  constructor() {
    this.indexerConfigRepository = AppDataSource.getRepository(IndexerConf);
  }

  async getConFigValue(key: string): Promise<string> {
    const config = await this.indexerConfigRepository.findOne({
      where: {
        key
      }
    });
    return config ? config.value : '';
  }

  async setConfigValue(key: string, value: string): Promise<IndexerConf> {
    const config = new IndexerConf();
    config.key = key;
    config.value = value;
    return await this.indexerConfigRepository.save(config);
  }

  async saveBatchConfig(configs: IndexerConf[]): Promise<IndexerConf[]> {
    return await this.indexerConfigRepository.save(configs);
  }
}

export default IndexerConfigService;
