import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('token_logs')
export default class TokenLog {
  @PrimaryColumn()
  log_index: number;

  @PrimaryColumn()
  tx_hash: string;

  @Column('bigint')
  block_number: bigint;

  @Column('text')
  block_hash: string;

  @Column()
  address: string;

  @Column()
  token_id: string;

  @Column()
  transaction_index: number;

  @Column('text')
  transaction_hash: string;

  @Column()
  removed: boolean;

  @Column('text')
  data: string;

  @Column('text')
  topics: string;
}
