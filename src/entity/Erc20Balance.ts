import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity('erc20_balances')
class Erc20Balance {
  @Column()
  @PrimaryColumn()
  owner: string; //hash indexed on this column

  @Column()
  @PrimaryColumn()
  token: string; //hash indexed on this column

  @Column('decimal', {
    precision: 78,
    scale: 0,
  })
  balance: string; //indexed on this column
  //some extras fields for no need to query the blockchain or the token contract table
  @Column({
    nullable: true,
  })
  decimals: number;
  @Column({
    nullable: true,
  })
  symbol: string;
  @Column({
    nullable: true,
  })
  name: string;
}

export default Erc20Balance;
