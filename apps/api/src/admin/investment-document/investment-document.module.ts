import { Module } from '@nestjs/common';
import { InvestmentDocumentService } from './investment-document.service';
import { InvestmentDocumentController } from './investment-document.controller';

@Module({
  providers: [InvestmentDocumentService],
  controllers: [InvestmentDocumentController]
})
export class InvestmentDocumentModule {}
