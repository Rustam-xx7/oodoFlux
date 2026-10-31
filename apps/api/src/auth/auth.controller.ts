import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; pass: string }) {
    const result = await this.authService.login(body.email, body.pass);
    return {
      success: true,
      data: result,
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      companyName?: string;
      phone?: string;
    },
  ) {
    const result = await this.authService.register(body);
    return {
      success: true,
      message: 'Account registered successfully',
      data: result,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req: any) {
    const profile = await this.authService.getProfile(req.user.sub);
    return {
      success: true,
      data: profile,
    };
  }
}
