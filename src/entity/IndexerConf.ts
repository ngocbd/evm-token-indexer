import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity('indexer_conf')
class IndexerConf {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;
}

export default IndexerConf;
