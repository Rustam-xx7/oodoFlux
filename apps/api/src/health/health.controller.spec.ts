import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(healthController).toBeDefined();
  });

  it('should return UP status from health check', async () => {
    const response = await healthController.getHealth();
    expect(response.success).toBe(true);
    expect(response.data.status).toBe('UP');
    expect(response.data.services.api.status).toBe('UP');
    expect(response.data.environment).toBe('test');
  });
});
