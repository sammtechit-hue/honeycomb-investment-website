import { Module } from '@nestjs/common';
import { InvestmentDocumentController } from './investment-document.controller';
import { InvestmentDocumentService } from './investment-document.service';

@Module({
  controllers: [InvestmentDocumentController],
  providers: [InvestmentDocumentService]
})
export class InvestmentDocumentModule {}
