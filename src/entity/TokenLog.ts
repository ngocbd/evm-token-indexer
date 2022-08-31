import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('token_logs')
export default class TokenLog {
  @PrimaryColumn()
  log_index: number;

  @PrimaryColumn()
  tx_hash: string;

  @Column()
  tx_index: number;

  @Column('bigint')
  block_number: bigint;

  @Column('text')
  block_hash: string;

  @Column()
  address: string;


  @Column()
  removed: boolean;

  @Column('text')
  data: string;

  @Column('text')
  topics: string;
}
