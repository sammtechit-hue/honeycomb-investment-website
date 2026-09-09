import { Module } from '@nestjs/common';
import { InvestorModule } from './investor/investor.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [InvestorModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
