import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

import { AuthService } from './auth.service';
import { MagicLink } from './entities/magic-link.entity';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;

  const magicRepo = {
    delete: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const userRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;
  const config = {
    get: (k: string) =>
      ({
        APP_BASE_URL: 'http://localhost:3000',
        MAGIC_TOKEN_TTL_MIN: '15',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      } as Record<string, string>)[k],
  } as unknown as jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(MagicLink), useValue: magicRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('requestMagic returns link and expiresAt', async () => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValueOnce(Buffer.from('11'.repeat(32), 'hex'));
    jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('hashed');

    userRepo.findOne.mockResolvedValue({ id: 1, email: 'a@b.com', employeeId: 'E1' });
    magicRepo.delete.mockResolvedValue(undefined);
    magicRepo.save.mockResolvedValue(undefined);

    const res = await service.requestMagic('a@b.com', 'E1');
    expect(res.ok).toBe(true);
    expect(res.link).toMatch(/\/api\/v1\/auth\/verify-magic\?token=/);
    expect(res.expiresAt).toBeTruthy();
    expect(magicRepo.save).toHaveBeenCalled();
  });

  it('verifyMagic validates token, marks used, issues tokens', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('rt-hash');
    jwt.signAsync = jest.fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token') as any;

    magicRepo.find.mockResolvedValue([
      {
        id: 1,
        tokenHash: 'hash',
        user: { id: 1, email: 'a@b.com', employeeId: 'E1' },
      },
    ]);
    magicRepo.save.mockResolvedValue(undefined);
    userRepo.update.mockResolvedValue(undefined);

    const res = await service.verifyMagic('ANY');
    expect(res.ok).toBe(true);
    expect(res.accessToken).toBe('access-token');
    expect(res.refreshToken).toBe('refresh-token');
  });

  it('refresh exchanges refresh token', async () => {
    jwt.verifyAsync = jest.fn().mockResolvedValue({ sub: 1 } as any);
    userRepo.findOne.mockResolvedValue({ id: 1, refreshTokenHash: 'rt-hash' });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('rt-hash2');
    jwt.signAsync = jest.fn()
      .mockResolvedValueOnce('access-2')
      .mockResolvedValueOnce('refresh-2') as any;
    userRepo.update.mockResolvedValue(undefined);

    const res = await service.refresh('refresh-1');
    expect(res.ok).toBe(true);
    expect(res.accessToken).toBe('access-2');
    expect(res.refreshToken).toBe('refresh-2');
  });

  it('logout clears refresh token hash', async () => {
    userRepo.update.mockResolvedValue(undefined);
    const res = await service.logout(1);
    expect(userRepo.update).toHaveBeenCalledWith(1, { refreshTokenHash: null });
    expect(res).toEqual({ ok: true });
  });
});
