import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService, HealthCheckResult } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<{ success: boolean; data: HealthCheckResult }> {
    const result = await this.healthService.check();
    return {
      success: true,
      data: result,
    };
  }
}
