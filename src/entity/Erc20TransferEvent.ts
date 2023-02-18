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
  address: string; // contract address => hash index on this column

  @Column()
  from: string; // from address => hash index on this column

  @Column()
  to: string; // to address => hash index on this column


  @Column('decimal', {
    precision: 78,
    scale: 0,
  })
  amount: string; // amount =>  index on this column

}

export default Erc20TransferEvent;
