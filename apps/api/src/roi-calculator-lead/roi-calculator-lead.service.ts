import { Injectable } from '@nestjs/common';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoiCalculatorLeadDto } from './dto/create-roi-calculator-lead.dto';

@Injectable()
export class RoiCalculatorLeadService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoiCalculatorLeadDto: CreateRoiCalculatorLeadDto) {
    const { name, phoneNumber, email, enteredAmount } =
      createRoiCalculatorLeadDto;

    await this.prisma.roiCalculatorLead.create({
      data: {
        name,
        phoneNumber,
        email,
        enteredAmount: new Prisma.Decimal(enteredAmount),
      },
    });

    return {
      message: 'ROI Calculator Lead created successfully',
      success: true,
    };
  }
}