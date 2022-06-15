import { ApiProperty } from '@nestjs/swagger';
import * as moment from 'moment';
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import { TABLE_PREFIX } from '../definitions';

export type TodoId = string;

@Entity({ name: TABLE_PREFIX + 'todo_entity' })
export class TodoEntity {
  @PrimaryColumn({ type: 'char', length: 36, nullable: false })
  @Generated('uuid')
  @ApiProperty({ example: '10ac3aed-4979-4fe8-82d1-c43c7183d446' })
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @ApiProperty()
  title!: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  description!: string;

  @Column({
    type: 'datetime',
    transformer: {
      from: (value: string) => moment.utc(value).toISOString(),
      to: (value: moment.MomentInput) => moment.utc(value).format('YYYY-MM-DD HH:mm:ss.SSS'),
    },
    nullable: false,
  })
  @ApiProperty({ example: new Date().toISOString() })
  dueDate!: string;

  @CreateDateColumn({
    type: 'datetime',
    transformer: {
      from: (value: string) => moment.utc(value).toISOString(),
      to: (value: moment.MomentInput) => moment.utc(value).format('YYYY-MM-DD HH:mm:ss.SSS'),
    },
  })
  @ApiProperty({ example: new Date().toISOString() })
  createdAt!: string;

  @UpdateDateColumn({
    type: 'datetime',
    transformer: {
      from: (value: string) => moment.utc(value).toISOString(),
      to: (value: moment.MomentInput) => moment.utc(value).format('YYYY-MM-DD HH:mm:ss.SSS'),
    },
  })
  @ApiProperty({ example: new Date().toISOString() })
  updatedAt!: string;

  @VersionColumn()
  entityVersion!: number;
}
