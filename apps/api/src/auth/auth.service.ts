import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { RoleName } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: RoleName;
  customerId?: string | null;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('AUTH_SECRET') ||
      'dev-jwt-secret-key-32-chars-long-security-token-value';
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, customer: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      customerId: user.customer?.id ?? null,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        customerId: user.customer?.id ?? null,
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone?: string;
  }) {
    // Check password policy: min 8 chars, 1 uppercase, 1 lowercase, 1 special char
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(data.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one special character.',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: RoleName.CUSTOMER },
    });

    if (!customerRole) {
      throw new BadRequestException('Customer role is not configured.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const count = await this.prisma.customer.count();
    const customerNumber = `CUST-2026-${String(count + 1).padStart(4, '0')}`;

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roleId: customerRole.id,
        customer: {
          create: {
            customerNumber,
            companyName: data.companyName || `${data.firstName} ${data.lastName}`,
            contactName: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            billingAddressLine1: 'Default Address',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India',
          },
        },
      },
      include: {
        role: true,
        customer: true,
      },
    });

    return this.login(data.email, data.password);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, customer: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
      customerId: user.customer?.id ?? null,
      customer: user.customer,
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
