import { Entity, Column, PrimaryColumn } from 'typeorm';
import TokenType from '../enums/TokenType';

@Entity('token_contracts')
export default class TokenContract {
  @PrimaryColumn()
  address: string;

  @Column('integer')
  type: TokenType;

  @Column({
    nullable: true,
  })
  name: string;
  @Column({
    nullable: true,
  })
  symbol: string;
  @Column({
    nullable: true,
  })
  decimal: string;
  @Column({
    nullable: true,
  })
  logo: string;
  @Column({
    nullable: true,
    type: 'text',
  })
  logo_hash: string;
  @Column({
    nullable: true,
  })
  thumbnail: string;
  //first block that we detect this token
  @Column({
    nullable: true,
    type: 'bigint',
  })
  block_number: bigint;

  @Column()
  validated: number;
}
