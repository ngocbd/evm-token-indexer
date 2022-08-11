import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('token_balances')
export default class TokenBalance {
  @Column()
  owner: string;
  @Column()
  token: string;
  @Column()
  token_id: string;
  @Column('bigint')
  balance: bigint;
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: bigint;
  @Column('bigint')
  block_number: bigint;
}
