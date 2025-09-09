import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly user: UsersService) {}

  @Get()
  findAll() {
    return this.user.findAll();
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.user.create(body);
  }

  @Get(':employeeId')
  async findByEmployeeId(@Param('employeeId') employeeId: string) {
    const user = await this.user.findByEmployeeId(employeeId);
    if (!user) {
      throw new NotFoundException(
        `User with employeeId ${employeeId} not found`,
      );
    }
    return user;
  }

  @Patch(':employeeId')
  async update(
    @Param('employeeId') employeeId: string,
    @Body() body: UpdateUserDto,
  ) {
    const user = await this.user.findByEmployeeId(employeeId);
    if (!user) {
      throw new NotFoundException(
        `User with employeeId ${employeeId} not found`,
      );
    }
    return this.user.update(user.id, body);
  }

  @Delete(':employeeId')
  async removeByEmployee(@Param('employeeId') employeeId: string) {
    const user = await this.user.findByEmployeeId(employeeId);
    if (!user) {
      throw new NotFoundException(
        `User with employeeId ${employeeId} not found`,
      );
    }
    return this.user.remove(user.id);
  }
}
