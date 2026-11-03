import { Prisma } from '@investment-platform/db';

export function buildOrderBy<T extends object>(
  sortBy: string,
  sortOrder: Prisma.SortOrder,
): T[] {
  return [
    { [sortBy]: sortOrder } as T,
    { id: 'asc' } as T,
  ];
}