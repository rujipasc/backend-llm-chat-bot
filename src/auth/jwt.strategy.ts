// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  ExtractJwt,
  type JwtFromRequestFunction,
  type StrategyOptions,
} from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../users/entities/user.entity';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  employeeId: string;
  role: UserRole; // ✅ ใช้ enum ตรง ๆ
  company?: string;
  bu?: string;
  pg?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    const fromHeader: JwtFromRequestFunction =
      ExtractJwt.fromAuthHeaderAsBearerToken();

    const opts: StrategyOptions = {
      jwtFromRequest: fromHeader, // ✅ ใช้ ExtractJwt โดยตรง (ไม่มี cast แปลก ๆ)
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
      ignoreExpiration: false,
    };

    super(opts);
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    // ค่าที่ return จะถูกผูกเป็น req.user
    return payload;
  }
}
