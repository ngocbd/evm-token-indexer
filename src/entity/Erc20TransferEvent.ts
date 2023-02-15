import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity('erc20_transfer_events')
class Erc20TransferEvent {
  @PrimaryColumn()
  log_index: number;
  @PrimaryColumn()
  tx_hash: string;

  @Column('bigint')
  block_number: number;

  @Column()
  address: string;

  @Column()
  from: string;

  @Column()
  to: string;


  @Column('decimal', {
    precision: 78,
    scale: 0,
  })
  amount: string;

}

export default Erc20TransferEvent;
