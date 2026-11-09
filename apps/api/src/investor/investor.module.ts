import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { InvestorService } from './investor.service';
import { InvestorController } from './investor.controller';

@Module({
  imports: [FilesModule],
  providers: [InvestorService],
  controllers: [InvestorController]
})
export class InvestorModule {}
