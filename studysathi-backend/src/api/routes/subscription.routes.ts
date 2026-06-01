import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionService } from '../../services/subscription.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class UpgradeDto {
  @ApiProperty({ example: 'razorpay' })
  @IsString()
  gateway: string;

  @ApiProperty({ example: 'pay_xyz123' })
  @IsString()
  externalId: string;
}

@ApiTags('subscription')
@ApiBearerAuth()
@Controller('api/subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription status' })
  async getStatus(@CurrentUser() user: any) {
    return this.subscriptionService.getSubscription(user.id);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade to Pro (after payment verification)' })
  async upgrade(@CurrentUser() user: any, @Body() dto: UpgradeDto) {
    return this.subscriptionService.upgradeToPro(user.id, dto);
  }
}
