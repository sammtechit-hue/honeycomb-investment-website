import { Module } from '@nestjs/common';
import { ReferralCodeService as ReferralCodeService } from './referral-code.service';
import { ReferralCodeController } from './referral-code.controller';

@Module({
  providers: [ReferralCodeService],
  controllers: [ReferralCodeController]
})
export class ReferralCodeModule {}
