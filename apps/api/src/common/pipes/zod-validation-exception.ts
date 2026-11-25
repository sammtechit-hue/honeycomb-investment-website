// apps/api/src/common/pipes/zod-validation-exception.ts

import { BadRequestException, HttpStatus } from '@nestjs/common';
import type { ZodError, ZodIssue } from 'zod';

/**
 * ============================================================================
 * ZOD VALIDATION EXCEPTION
 * ============================================================================
 * Same response shape as nestjs-zod's default ZodValidationException:
 *
 *   { statusCode: 400, message: 'Validation failed', errors: ZodIssue[] }
 *
 * with one difference: bulk endpoints accept a `rows` array, and zod reports
 * issues by 0-based array position (`['rows', 0, 'amount']`). Spreadsheet users
 * count rows from 1, so shift the index on `rows.<index>` paths only. Every
 * other issue is reported exactly as zod produced it.
 */
const toDisplayPath = (path: ZodIssue['path']): ZodIssue['path'] => {
  if (path[0] !== 'rows' || typeof path[1] !== 'number') return path;
  return [path[0], path[1] + 1, ...path.slice(2)];
};

export const createZodValidationException = (error: ZodError): Error =>
  new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Validation failed',
    errors: error.errors.map((issue) => ({
      ...issue,
      path: toDisplayPath(issue.path),
    })),
  });
