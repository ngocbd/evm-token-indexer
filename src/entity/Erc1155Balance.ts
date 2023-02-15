import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('erc1155_balances')
class Erc1155Balance {
  @PrimaryColumn()
  token: string;

  @PrimaryColumn()
  owner: string;

  @PrimaryColumn()
  tokenId: string
  @Column('decimal', {
    precision: 78,
    scale: 0,
  })
  amount: string;
}

export default Erc1155Balance;
