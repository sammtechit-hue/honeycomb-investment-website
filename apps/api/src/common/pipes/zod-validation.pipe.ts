// apps/api/src/common/pipes/zod-validation.pipe.ts

import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * ============================================================================
 * ZOD VALIDATION PIPE
 * ============================================================================
 * Custom NestJS pipe that validates incoming data against Zod schemas
 * 
 * Usage in controller:
 * @Post()
 * create(@Body(new ZodValidationPipe(createInvestorSchema)) dto: InvestorCreateInput) {
 *   // dto is validated and typed
 * }
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      // Parse and validate the value against the schema
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a user-friendly structure
        throw new BadRequestException({
          message: 'Validation failed',
          statusCode: 400,
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}