// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { MagicLink } from './entities/magic-link.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AppMailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [
    ConfigModule, // ถ้าตั้ง isGlobal:true แล้ว อันนี้จะไม่จำเป็น แต่ใส่ไว้ได้
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TTL') ?? '15m',
        },
      }),
    }),
    UsersModule,
    AppMailerModule,
    TypeOrmModule.forFeature([MagicLink, User]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
