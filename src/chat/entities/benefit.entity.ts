import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('emp_benefit')
export class Benefit {
  @PrimaryGeneratedColumn({ name: 'rowID', type: 'int' })
  rowId: number;

  @Index()
  @Column({ name: 'EmployeeID', type: 'varchar', length: 20, nullable: true })
  employeeId: string | null;

  @Column({
    name: 'PolicyProfile',
    type: 'varchar',
    length: 25,
    nullable: true,
  })
  policyProfile?: string | null;

  @Column({ name: 'IPD_Room', type: 'int', nullable: true })
  ipdRoom?: number | null;

  @Column({
    name: 'MedAccu',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  medAccu?: string | null;

  @Column({
    name: 'MedBalance',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  medBalance?: string | null;

  @Column({
    name: 'DenAccu',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  denAccu?: string | null;

  @Column({
    name: 'DenBalance',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  denBalance?: string | null;

  @Column({ name: 'MaxCredit', type: 'int', nullable: true })
  maxCredit?: number | null;
}
