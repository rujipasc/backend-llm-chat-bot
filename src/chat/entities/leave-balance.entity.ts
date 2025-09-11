import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('leave_balances')
export class LeaveBalance {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_leave_employee')
  @Column({ name: 'employee_id', type: 'varchar', length: 20, nullable: false })
  employeeId: string;

  @Column({
    name: 'accrual_bank',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  accrualBank: string;

  @Column({
    name: 'accrued',
    type: 'numeric',
    precision: 10,
    scale: 3,
    default: 0,
  })
  accrued: string; // keep as string to avoid precision issues

  @Column({
    name: 'used',
    type: 'numeric',
    precision: 10,
    scale: 3,
    default: 0,
  })
  used: string;

  @Column({
    name: 'ending_balance',
    type: 'numeric',
    precision: 10,
    scale: 3,
    default: 0,
  })
  endingBalance: string;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt?: Date | null;
}
