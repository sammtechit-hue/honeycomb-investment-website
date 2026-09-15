import { Module } from '@nestjs/common';
import { RoiCalculatorLeadService } from './roi-calculator-lead.service';
import { RoiCalculatorLeadController } from './roi-calculator-lead.controller';

@Module({
  providers: [RoiCalculatorLeadService],
  controllers: [RoiCalculatorLeadController],
})
export class RoiCalculatorLeadModule {}
