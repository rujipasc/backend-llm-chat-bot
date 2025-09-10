import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { User } from './entities/user.entity';

// type guard ช่วยบอก TS ว่า error นี้คือ QueryFailedError และอาจมี code/detail จาก pg
function isPgQueryFailedError(
  err: unknown,
): err is QueryFailedError & { code?: string; detail?: string } {
  return err instanceof QueryFailedError;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async create(data: Partial<User>) {
    try {
      const user = this.repo.create(data);
      return await this.repo.save(user);
    } catch (err: unknown) {
      if (isPgQueryFailedError(err) && err.code === '23505') {
        // เจาะว่า field ไหนซ้ำจาก detail ได้
        const d = err.detail ?? '';
        if (d.includes('email'))
          throw new ConflictException('Email already exists');
        if (d.includes('employeeId'))
          throw new ConflictException('Employee ID already exists');
        throw new ConflictException('Duplicate entry');
      }
      throw err;
    }
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findByEmployeeId(employeeId: string) {
    return this.repo.findOne({ where: { employeeId } });
  }

  async findOneWithNames(id: number) {
    return this.repo.findOne({
      where: { id },
      select: [
        'id',
        'employeeId',
        'email',
        'role',
        'bu',
        'company',
        'pg',
        'firstName',
        'lastName',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async update(id: number, data: Partial<User>) {
    try {
      await this.repo.update(id, data);
      const updated = await this.findOne(id);
      if (!updated) throw new NotFoundException(`User with ID ${id} not found`);
      return updated;
    } catch (err: unknown) {
      if (isPgQueryFailedError(err) && err.code === '23505') {
        const d = err.detail ?? '';
        if (d.includes('email'))
          throw new ConflictException('Email already exists');
        if (d.includes('employeeId'))
          throw new ConflictException('Employee ID already exists');
        throw new ConflictException('Duplicate entry');
      }
      throw err;
    }
  }

  async remove(id: number) {
    const res = await this.repo.delete(id);
    if (!res.affected)
      throw new NotFoundException(`User with ID ${id} not found`);
    return { message: `User with ID ${id} deleted successfully` };
  }
}
