import { Module } from '@nestjs/common';
import { RefferalCodeService } from './refferal-code.service';
import { RefferalCodeController } from './refferal-code.controller';

@Module({
  providers: [RefferalCodeService],
  controllers: [RefferalCodeController]
})
export class RefferalCodeModule {}
