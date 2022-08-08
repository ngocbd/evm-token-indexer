import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health check')
export class HealthController {
  @Get()
  healthCheck(): string {
    return 'ok';
  }
}
