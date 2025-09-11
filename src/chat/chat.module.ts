import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LeaveBalance } from './entities/leave-balance.entity';
import { Benefit } from './entities/benefit.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([LeaveBalance, Benefit])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
