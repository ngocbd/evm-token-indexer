import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transfer_events')
export default class TransferEvent {
  @PrimaryColumn()
  log_index: number;
  @PrimaryColumn()
  tx_hash: string;
  @Column('bigint')
  block_number: bigint;
  @Column()
  address: string;
  @Column()
  from: string;
  @Column()
  to: string;
  @Column()
  token_id: string;
  @Column()
  amount: string;
}
