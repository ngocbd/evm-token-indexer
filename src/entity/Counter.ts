import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import CounterName from "../enums/CounterName";

@Entity('counters')
class Counter {

  @PrimaryColumn('varchar', {
    length: 255,
    name: 'relation_name',
  })
  relationName: CounterName;

  @Column('bigint')
  counter: number;

}

export default Counter;
