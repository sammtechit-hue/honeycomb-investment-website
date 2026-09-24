import { Injectable } from '@nestjs/common';
import { CreateRoiCalculatorLeadDto } from './dto/create-roi-calculator-lead.dto';

@Injectable()
export class RoiCalculatorLeadService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  

  // For Creating RoiCalculatorLead
  async create(createRoiCalculatorLeadDto: CreateRoiCalculatorLeadDto) {
    const { name, phoneNumber, email, enteredAmount } = createRoiCalculatorLeadDto;

    return {
      message: 'RoiCalculatorLead Created Successfully',
    };
  }
}
