import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const auth = {
    requestMagic: jest.fn(),
    verifyMagic: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('request-magic calls service with dto', async () => {
    (auth.requestMagic as jest.Mock).mockResolvedValue({ ok: true });
    const res = await controller.requestMagic({ email: 'a@b.com', employeeId: 'E1' });
    expect(auth.requestMagic).toHaveBeenCalledWith('a@b.com', 'E1');
    expect(res).toEqual({ ok: true });
  });

  it('verify-magic (POST) calls service with token', async () => {
    (auth.verifyMagic as jest.Mock).mockResolvedValue({ ok: true });
    const res = await controller.verifyMagic({ token: 'TOKEN' });
    expect(auth.verifyMagic).toHaveBeenCalledWith('TOKEN');
    expect(res).toEqual({ ok: true });
  });

  it('verify-magic (GET) calls service with token', async () => {
    (auth.verifyMagic as jest.Mock).mockResolvedValue({ ok: true });
    const res = await controller.verifyMagicGet('TOKEN');
    expect(auth.verifyMagic).toHaveBeenCalledWith('TOKEN');
    expect(res).toEqual({ ok: true });
  });

  it('refresh calls service with refreshToken', async () => {
    (auth.refresh as jest.Mock).mockResolvedValue({ ok: true });
    const res = await controller.refresh({ refreshToken: 'REF' });
    expect(auth.refresh).toHaveBeenCalledWith('REF');
    expect(res).toEqual({ ok: true });
  });

  it('logout calls service with req.user.sub', async () => {
    (auth.logout as jest.Mock).mockResolvedValue({ ok: true });
    const res = await controller.logout({ user: { sub: 123 } } as any);
    expect(auth.logout).toHaveBeenCalledWith(123);
    expect(res).toEqual({ ok: true });
  });
});
