import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transactions')
export default class Transaction {
  @PrimaryColumn()
  tx_hash: string;
  @Column('bigint')
  block_number: bigint;
  @Column()
  gasPrice: string;
  @Column('bigint')
  nonce: bigint;
  @Column()
  to: string;
  @Column()
  value: string;
  @Column('text')
  data: string;
}
