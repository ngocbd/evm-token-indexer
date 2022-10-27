import {Column, Entity, PrimaryColumn} from 'typeorm';

@Entity('token_balances')
export default class TokenBalance {
  @Column()
  @PrimaryColumn()
  owner: string;

  @Column()
  token: string;

  @Column()
  @PrimaryColumn()
  token_id: string;

  @Column('bigint')
  balance: bigint;
}
