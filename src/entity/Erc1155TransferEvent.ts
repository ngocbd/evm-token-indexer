import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";

@Entity('erc1155_transfer_events')
class Erc1155TransferEvent {

  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
  })
  id: number;

  @Column()
  log_index: number;

  @Column()
  tx_hash: string;

  @Column('bigint')
  block_number: number;

  @Column()
  address: string;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column({
    name: 'token_id',
  })
  tokenId: string;

  @Column('decimal', {
    name: 'amount',
    precision: 78,
    scale: 0,
  })
  amount: string;
}

export default Erc1155TransferEvent;
