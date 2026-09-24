import { Module } from '@nestjs/common';
import { RoiCalculatorLeadController } from './roi-calculator-lead.controller';
import { RoiCalculatorLeadService } from './roi-calculator-lead.service';

@Module({
  controllers: [RoiCalculatorLeadController],
  providers: [RoiCalculatorLeadService]
})
export class RoiCalculatorLeadModule {}
