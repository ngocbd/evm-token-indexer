import {Column, Entity, PrimaryColumn} from "typeorm";

@Entity('erc721_balances')
class Erc721Balance {
  @Column()
  @PrimaryColumn()
  owner: string; //hash indexed on this column

  @Column()
  @PrimaryColumn()
  token: string; //hash indexed on this column

  @Column('text', {
    name: 'token_ids',
  })
  tokenIds: string; // will be comma separated list of token ids ex: 1,2,3,4,5

  //some extras fields for no need to query the blockchain or the token contract table
  @Column({
    nullable: true,
  })
  symbol: string;

  @Column({
    nullable: true,
  })
  name: string;
}

export default Erc721Balance;
