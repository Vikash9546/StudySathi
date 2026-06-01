import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService, UpdateProfileDto, CompleteOnboardingDto } from '../../services/profile.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('api/profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  async update(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Complete onboarding flow' })
  async onboarding(@CurrentUser() user: any, @Body() dto: CompleteOnboardingDto) {
    return this.profileService.completeOnboarding(user.id, dto);
  }

  @Get('weak-topics')
  @ApiOperation({ summary: 'Get weak, medium, and strong topics' })
  async weakTopics(@CurrentUser() user: any) {
    return this.profileService.getWeakTopics(user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get home dashboard data' })
  async dashboard(@CurrentUser() user: any) {
    return this.profileService.getDashboard(user.id);
  }
}
