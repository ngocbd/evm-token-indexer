import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity('erc721_transfer_events')
class Erc721TransferEvent {
  @PrimaryColumn()
  log_index: number;
  @PrimaryColumn()
  tx_hash: string;

  @Column('bigint')
  block_number: number;

  @Column()
  address: string; // contract address => hash index on this column

  @Column()
  from: string;  // from address => hash index on this column

  @Column()
  to: string;   // to address => hash index on this column

  @Column({
    name: 'token_id',
  })
  tokenId: string;

}

export default Erc721TransferEvent;
