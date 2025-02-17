import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transactions')
export default class Transaction {
  @PrimaryColumn()
  tx_hash: string;
  @Column('bigint')
  block_number: bigint;
  @Column({
    name: 'gas_price',
  })
  gasPrice: string;
  @Column('bigint')
  nonce: bigint;
  @Column()
  to: string;
  @Column({
    nullable: true,
  })
  from: string;
  @Column()
  value: string;
  @Column('text')
  data: string;
  @Column('text')
  signature: string;
}
