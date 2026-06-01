import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../config/prisma.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });

    // Create verification token
    const verToken = uuidv4();
    await this.prisma.emailVerificationToken.create({
      data: {
        email: dto.email,
        token: verToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    // TODO: Send verification email (nodemailer)
    this.logger.log(`Verification token for ${dto.email}: ${verToken}`);

    const tokens = await this.generateTokens(user.id, user.email, user.plan);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Login ─────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.plan);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Refresh Token ─────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: delete old, create new
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.plan,
    );
  }

  // ── Google OAuth ──────────────────────────────────────────────────────
  async googleLogin(googleUser: {
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
          provider: 'GOOGLE',
          isEmailVerified: true,
          oauthAccounts: {
            create: {
              provider: 'google',
              providerId: googleUser.providerId,
            },
          },
        },
      });
    } else {
      // Ensure oauth account is linked
      await this.prisma.oAuthAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId: googleUser.providerId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          provider: 'google',
          providerId: googleUser.providerId,
        },
      });
    }

    return this.generateTokens(user.id, user.email, user.plan);
  }

  // ── Email Verification ────────────────────────────────────────────────
  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { email: record.email },
      data: { isEmailVerified: true },
    });
    await this.prisma.emailVerificationToken.delete({ where: { token } });
    return { message: 'Email verified successfully' };
  }

  // ── Forgot Password ───────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user)
      return { message: 'If that email exists, a reset link has been sent' };

    const token = uuidv4();
    await this.prisma.passwordResetToken.create({
      data: {
        email: dto.email,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    // TODO: send email
    this.logger.log(`Password reset token for ${dto.email}: ${token}`);
    return { message: 'If that email exists, a reset link has been sent' };
  }

  // ── Reset Password ────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { email: record.email },
      data: { passwordHash },
    });
    await this.prisma.passwordResetToken.delete({
      where: { token: dto.token },
    });
    return { message: 'Password reset successfully' };
  }

  // ── Logout ────────────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async generateTokens(userId: string, email: string, plan: any) {
    const payload = { sub: userId, email, plan };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = uuidv4();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30d
      },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
