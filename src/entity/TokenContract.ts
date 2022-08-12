import { Entity, Column, PrimaryColumn } from 'typeorm';
import TokenType from '../enums/TokenType';

@Entity('token_contracts')
export default class TokenContract {
  @PrimaryColumn()
  address: string;

  @Column('integer')
  type: TokenType;
}
