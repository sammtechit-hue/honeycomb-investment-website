import type { Prisma } from '@investment-platform/db';

type FetchOptions<TSelect, TInclude> = {
  select?: TSelect;
  include?: TInclude;
};

// Only add the keys the caller actually passed, so Prisma keeps its normal
// default selection (and its precise result type) when neither is provided.
type FetchArgs<TWhere, TOrderBy, TSelect, TInclude> = {
  where: TWhere;
  orderBy: TOrderBy[];
  skip: number;
  take: number;
} & (TSelect extends undefined ? unknown : { select: TSelect }) &
  (TInclude extends undefined ? unknown : { include: TInclude });

export async function fetchData<
  TModel extends { findMany: (args: any) => any; count: (args: any) => any },
  TWhere,
  TOrderBy,
  TSelect = undefined,
  TInclude = undefined,
>(
  model: TModel,
  where: TWhere,
  orderBy: TOrderBy[],
  page: number,
  limit: number,
  options?: FetchOptions<TSelect, TInclude>,
): Promise<
  [
    Prisma.Result<
      TModel,
      FetchArgs<TWhere, TOrderBy, TSelect, TInclude>,
      'findMany'
    >,
    number,
  ]
> {
  return Promise.all([
    model.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      ...(options?.select !== undefined && { select: options.select }),
      ...(options?.include !== undefined && { include: options.include }),
    }),
    model.count({ where }),
  ]);
}
