import { Module } from '@nestjs/common';
import { InvestorKycDocumentController } from './investor-kyc-document.controller';
import { InvestorKycDocumentService } from './investor-kyc-document.service';

@Module({
  controllers: [InvestorKycDocumentController],
  providers: [InvestorKycDocumentService]
})
export class InvestorKycDocumentModule {}
