import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import TokenType from '../enums/TokenType';

@Entity('transfer_events')
export default class TransferEvent {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
  })
  id: bigint;

  @Column()
  log_index: number;
  @Column()
  tx_hash: string;

  @Column('bigint')
  block_number: bigint;

  @Column()
  address: string;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column({
    nullable: true,
  })
  token_id: string;

  @Column()
  amount: string;

  @Column({
    default: TokenType.UNKNOWN,
  })
  tokenType: TokenType;
}
