export async function fetchData<TData, TWhere, TOrderBy>(
  model: {
    findMany: (args: {
      where: TWhere;
      orderBy: TOrderBy[];
      skip: number;
      take: number;
    }) => Promise<TData[]>;
    count: (args: { where: TWhere }) => Promise<number>;
  },
  where: TWhere,
  orderBy: TOrderBy[],
  page: number,
  limit: number,
) {
  return Promise.all([
    model.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    model.count({ where }),
  ]);
}