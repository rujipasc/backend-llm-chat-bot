// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import * as crypto from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MagicLink } from './entities/magic-link.entity';
import { User } from '../users/entities/user.entity';
import type { AccessTokenPayload } from './jwt.strategy';
import { MailerCustomService } from 'src/mailer/mailer.service';

@Injectable()
export class AuthService {
  private readonly MAGIC_TTL_MIN: number;
  private readonly ACCESS_TTL: string;
  private readonly REFRESH_TTL: string;
  private readonly appBaseUrl: string;

  constructor(
    @InjectRepository(MagicLink)
    private readonly magicLinkRepository: Repository<MagicLink>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerCustomService,
  ) {
    this.MAGIC_TTL_MIN = parseInt(
      this.config.get('MAGIC_TOKEN_TTL_MIN') ?? '15',
      10,
    );
    this.ACCESS_TTL = this.config.get('JWT_ACCESS_TTL') ?? '15m';
    this.REFRESH_TTL = this.config.get('JWT_REFRESH_TTL') ?? '7d';
    this.appBaseUrl =
      this.config.get('APP_BASE_URL') ?? 'http://localhost:3000';
  }

  async requestMagic(email: string, employeeId?: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      // ต้องเลือก firstName/lastName เพราะคอลัมน์ถูกตั้ง select:false
      select: ['id', 'email', 'employeeId', 'firstName', 'lastName'],
    });
    if (!user) throw new BadRequestException('User not found');
    if (employeeId && user.employeeId !== employeeId) {
      throw new BadRequestException('Invalid employeeId');
    }

    await this.magicLinkRepository.delete({
      user: { id: user.id },
      usedAt: IsNull(),
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + this.MAGIC_TTL_MIN * 60_000);

    await this.magicLinkRepository.save(
      this.magicLinkRepository.create({ user, tokenHash, expiresAt }),
    );

    const link = `${this.appBaseUrl}/api/v1/auth/verify-magic?token=${token}`;

    // ✅ ส่งเมล
    await this.mailer.sendMagicLink(
      user.email,
      user.employeeId,
      user.firstName ?? '',
      user.lastName ?? '',
      link,
      this.MAGIC_TTL_MIN,
    );

    // ✅ return แยกตาม env
    if (this.config.get('NODE_ENV') === 'production') {
      return { ok: true, expiresAt };
    }
    return { ok: true, link, expiresAt }; // dev
  }

  // Verify magic link token and issue JWTs
  async verifyMagic(token: string) {
    if (!token) throw new BadRequestException('Token is required');

    const activeLinks = await this.magicLinkRepository.find({
      where: { usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    let matched: MagicLink | undefined;
    for (const link of activeLinks) {
      const ok = await bcrypt.compare(token, link.tokenHash);
      if (ok) {
        matched = link;
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Invalid or expired token');

    const user = await this.userRepository.findOne({
      where: { id: matched.user.id },
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
      ],
    });

    if (!user) throw new NotFoundException('User not found');
    // Mark as used (เฉพาะ production)
    if (this.config.get('NODE_ENV') !== 'development') {
      matched.usedAt = new Date();
      await this.magicLinkRepository.save(matched);
    }
    const tokens = await this.issueTokens(user);
    return { ok: true, user, ...tokens };
  }

  // Exchange refresh token for new tokens (rotation)
  async refresh(refreshToken: string) {
    if (!refreshToken)
      throw new BadRequestException('refreshToken is required');

    let payload: AccessTokenPayload & { sub: number };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      // ต้องใช้ฟิลด์ให้ครบสำหรับ payload ใหม่ ไม่งั้น token หลัง refresh จะขาดข้อมูล
      select: [
        'id',
        'email',
        'refreshTokenHash',
        'employeeId',
        'role',
        'company',
        'bu',
        'pg',
      ],
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.refreshTokenHash)
      throw new UnauthorizedException('Refresh token revoked');

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.issueTokens(user);
    return { ok: true, ...tokens };
  }

  // Logout: revoke refresh token
  async logout(userId: number) {
    await this.userRepository.update(userId, { refreshTokenHash: null });
    return { ok: true };
  }

  // Helper to sign and persist tokens
  private async issueTokens(user: User) {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      company: user.company,
      bu: user.bu,
      pg: user.pg,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.ACCESS_TTL,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.REFRESH_TTL,
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, { refreshTokenHash });

    return { accessToken, refreshToken };
  }
}
